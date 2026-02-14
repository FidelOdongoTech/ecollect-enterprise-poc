import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Volume2, VolumeX, MessageSquare, Trash2, Settings, X } from 'lucide-react';
import { Account, NoteHistory, ChatMessage } from '../types';
import { generateAIResponse } from '../services/aiService';
import { RiskBadge } from './RiskBadge';
import { VoiceInput } from './VoiceInput';

interface ChatInterfaceProps {
  account: Account | null;
  notes: NoteHistory[];
}

// Helper to get localStorage key for an account
const getStorageKey = (accountNumber: string) => `ecollect_chat_${accountNumber}`;

// Helper to format text with bold account numbers
const formatMessageContent = (content: string): string => {
  // Replace **text** with <strong>text</strong>
  let formatted = content.replace(/\*\*([^*]+)\*\*/g, '%%BOLD_START%%$1%%BOLD_END%%');
  // Also bold any standalone account number patterns (alphanumeric 10+ chars starting with A or letters)
  formatted = formatted.replace(/\b([A-Z]{1,3}\d{8,})\b/g, '%%BOLD_START%%$1%%BOLD_END%%');
  return formatted;
};

// Render formatted content with proper React elements
const RenderFormattedContent = ({ content }: { content: string }) => {
  const formatted = formatMessageContent(content);
  const parts = formatted.split(/(%%BOLD_START%%|%%BOLD_END%%)/);
  
  let isBold = false;
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (part === '%%BOLD_START%%') {
      isBold = true;
    } else if (part === '%%BOLD_END%%') {
      isBold = false;
    } else if (part) {
      if (isBold) {
        elements.push(<strong key={index} className="font-semibold text-slate-900">{part}</strong>);
      } else {
        elements.push(<span key={index}>{part}</span>);
      }
    }
  });
  
  return <>{elements}</>;
};

// Voice settings interface
interface VoiceSettings {
  voiceIndex: number;
  rate: number;
  pitch: number;
  autoSpeak: boolean;
}

const defaultVoiceSettings: VoiceSettings = {
  voiceIndex: 0,
  rate: 1,
  pitch: 1,
  autoSpeak: false
};

// Get voice settings from localStorage
const getVoiceSettings = (): VoiceSettings => {
  const saved = localStorage.getItem('ecollect_voice_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultVoiceSettings;
    }
  }
  return defaultVoiceSettings;
};

// Save voice settings to localStorage
const saveVoiceSettings = (settings: VoiceSettings) => {
  localStorage.setItem('ecollect_voice_settings', JSON.stringify(settings));
};

export function ChatInterface({ account, notes }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(getVoiceSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        
        // Try to find a female voice by default if no settings saved
        const savedSettings = getVoiceSettings();
        if (savedSettings.voiceIndex === 0) {
          const femaleVoiceIndex = voices.findIndex(v => 
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('victoria') ||
            v.name.toLowerCase().includes('karen') ||
            v.name.toLowerCase().includes('moira') ||
            v.name.toLowerCase().includes('fiona') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('hazel') ||
            v.name.includes('Microsoft Zira') ||
            v.name.includes('Google UK English Female') ||
            v.name.includes('Google US English')
          );
          if (femaleVoiceIndex !== -1) {
            const newSettings = { ...savedSettings, voiceIndex: femaleVoiceIndex };
            setVoiceSettings(newSettings);
            saveVoiceSettings(newSettings);
          }
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Update voice settings
  const updateVoiceSettings = (updates: Partial<VoiceSettings>) => {
    const newSettings = { ...voiceSettings, ...updates };
    setVoiceSettings(newSettings);
    saveVoiceSettings(newSettings);
  };

  // Load messages from localStorage when account changes
  useEffect(() => {
    if (account) {
      const storageKey = getStorageKey(account.accnumber);
      const savedMessages = localStorage.getItem(storageKey);
      
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          const messagesWithDates = parsed.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } catch {
          createWelcomeMessage();
        }
      } else {
        createWelcomeMessage();
      }
    }
  }, [account, notes.length]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (account && messages.length > 0) {
      const storageKey = getStorageKey(account.accnumber);
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, account]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createWelcomeMessage = () => {
    if (account) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `I'm ready to assist with account **${account.accnumber}**. I have access to ${notes.length} interaction notes.\n\nHow can I help you today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  };

  const clearConversation = () => {
    if (account) {
      const storageKey = getStorageKey(account.accnumber);
      localStorage.removeItem(storageKey);
      createWelcomeMessage();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !account) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const response = await generateAIResponse(input, account, notes, conversationHistory);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak if enabled
      if (voiceSettings.autoSpeak) {
        setTimeout(() => speakMessage(response), 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setInput(transcript);
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
      
      // Apply voice settings
      if (availableVoices.length > 0 && voiceSettings.voiceIndex < availableVoices.length) {
        utterance.voice = availableVoices[voiceSettings.voiceIndex];
      }
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Test voice with current settings
  const testVoice = () => {
    speakMessage("Hello! I'm your AI collections assistant. How can I help you today?");
  };

  const quickActions = [
    'Summarize account history',
    'Recommend collection strategy',
    'Draft payment reminder',
    'Identify risk factors'
  ];

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-[15px] font-semibold text-slate-700">No Account Selected</h3>
          <p className="text-[13px] text-slate-500 mt-1">Select an account from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-slate-900">{account.customerName}</h3>
                <RiskBadge dpd={account.dpd} status={account.status} size="xs" />
              </div>
              <p className="text-[12px] text-slate-500 font-mono font-medium">{account.accnumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">DPD</p>
                <p className="text-lg font-bold text-slate-900">{account.dpd}</p>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Notes</p>
                <p className="text-lg font-bold text-slate-900">{account.noteCount}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`p-2 rounded-lg transition-all ${showVoiceSettings ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title="Voice settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={clearConversation}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Voice Settings Panel */}
      {showVoiceSettings && (
        <div className="bg-white border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voice Settings
            </h4>
            <button
              onClick={() => setShowVoiceSettings(false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Voice Selection */}
            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Voice</label>
              <select
                value={voiceSettings.voiceIndex}
                onChange={(e) => updateVoiceSettings({ voiceIndex: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableVoices.map((voice, index) => (
                  <option key={index} value={index}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Speed */}
            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                Speed: {voiceSettings.rate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.rate}
                onChange={(e) => updateVoiceSettings({ rate: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Pitch */}
            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                Pitch: {voiceSettings.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.pitch}
                onChange={(e) => updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Test & Auto-speak */}
            <div className="flex flex-col gap-2">
              <button
                onClick={testVoice}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-2"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Test Voice
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceSettings.autoSpeak}
                  onChange={(e) => updateVoiceSettings({ autoSpeak: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-600 font-medium">Auto-speak responses</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              message.role === 'user' 
                ? 'bg-blue-600' 
                : 'bg-gradient-to-br from-slate-700 to-slate-900'
            }`}>
              {message.role === 'user' 
                ? <User className="w-4 h-4 text-white" />
                : <Bot className="w-4 h-4 text-white" />
              }
            </div>

            {/* Message Bubble */}
            <div className={`max-w-[70%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
                  {message.role === 'assistant' ? (
                    <RenderFormattedContent content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
              
              <div className={`flex items-center gap-2 mt-1.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
                <span className="text-[10px] text-slate-400 font-medium">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.role === 'assistant' && (
                  <button
                    onClick={() => speakMessage(message.content)}
                    className={`p-1 rounded transition-all ${
                      isSpeaking ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    title={isSpeaking ? "Stop speaking" : "Read aloud"}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-[12px] text-slate-500 font-medium">Analyzing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInput(action)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[12px] font-medium rounded-lg transition-all shadow-sm"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <VoiceInput 
            onTranscript={handleVoiceInput} 
            isListening={isListening}
            setIsListening={setIsListening}
          />
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this account..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2 font-medium text-[13px] shadow-sm hover:shadow"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
