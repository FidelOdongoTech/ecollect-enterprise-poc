import Groq from 'groq-sdk';
import { NoteHistory, Account, SMSLog } from '@/types';
import { calculateRisk, getRiskDescription } from '@/utils/riskLogic';
import { getSMSStats } from './dataService';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

const groq = new Groq({
  apiKey: groqApiKey,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are eCollect AI, an intelligent debt collection assistant for eCollect Enterprise. You help collection agents understand customer histories, assess risk, and recommend next actions.

Your role is to:
1. Analyze customer interaction history and payment patterns from the historical notes
2. Provide risk assessments based on Days Past Due (DPD) and account status
3. Suggest effective collection strategies based on past interactions
4. Help agents prepare for customer conversations
5. Summarize account histories concisely
6. Identify patterns in customer behavior from the notes

Guidelines:
- Be professional and compliance-aware
- Reference specific notes, dates, and owners when available from the history
- Consider the full context of customer interactions
- Suggest escalation when appropriate (legal, management review)
- Recommend empathetic approaches while maintaining business objectives
- Always consider regulatory compliance (FDCPA, TCPA, etc.)
- Base your recommendations on the ACTUAL note history provided

Format responses clearly with bullet points when listing multiple items.
Be concise but thorough in your analysis.
When discussing notes, reference them by date and owner when possible.`;

/**
 * Generate AI response based on customer context
 */
export async function generateAIResponse(
  userMessage: string,
  account: Account | null,
  notes: NoteHistory[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  smsLogs?: SMSLog[]
): Promise<string> {
  try {
    // Build context from account and notes
    let contextMessage = '';
    
    if (account) {
      const risk = calculateRisk(account.dpd, account.status);
      const riskDesc = getRiskDescription(risk.level);
      
      contextMessage = `
CURRENT ACCOUNT CONTEXT:
- Account Number: ${account.accnumber}
- Customer Number: ${account.custnumber}
- Days Past Due (DPD): ${account.dpd}
- Risk Level: ${risk.level} - ${riskDesc}
- Status: ${account.status}
- Last Contact: ${account.lastContact}
- Total Notes in History: ${account.noteCount}

`;
    }

    if (notes.length > 0) {
      contextMessage += `INTERACTION HISTORY FROM DATABASE (Most Recent First):\n`;
      contextMessage += `Total Notes: ${notes.length}\n\n`;
      
      // Include all notes (up to 15 most recent for context window management)
      const recentNotes = notes.slice(0, 15);
      
      recentNotes.forEach((note, index) => {
        contextMessage += `--- Note ${index + 1} ---\n`;
        contextMessage += `Date: ${note.notedate || 'N/A'}\n`;
        contextMessage += `Owner/Agent: ${note.owner || 'N/A'}\n`;
        contextMessage += `Source: ${note.notesrc || 'N/A'}\n`;
        contextMessage += `Reason: ${note.reason || 'N/A'}\n`;
        contextMessage += `Details: ${note.reasondetails || 'N/A'}\n`;
        contextMessage += `Importance: ${note.noteimp || 'N/A'}\n`;
        contextMessage += `Note Content: ${note.notemade || 'N/A'}\n\n`;
      });

      if (notes.length > 15) {
        contextMessage += `[... and ${notes.length - 15} older notes not shown]\n`;
      }
    } else {
      contextMessage += 'No interaction history found for this account.\n';
    }

    // Add SMS context if available
    if (smsLogs && smsLogs.length > 0) {
      const smsStats = getSMSStats(smsLogs);
      
      contextMessage += `\nSMS COMMUNICATION HISTORY:\n`;
      contextMessage += `- Total SMS Sent: ${smsStats.total}\n`;
      contextMessage += `- Successfully Delivered: ${smsStats.successful}\n`;
      contextMessage += `- Failed: ${smsStats.failed}\n`;
      contextMessage += `- Delivery Rate: ${smsStats.successRate}%\n`;
      if (smsStats.latestArrears) {
        contextMessage += `- Latest Arrears Mentioned: Kes ${smsStats.latestArrears.toLocaleString()}\n`;
      }
      if (smsStats.latestDPD) {
        contextMessage += `- Latest DPD from SMS: ${smsStats.latestDPD} days\n`;
      }
      contextMessage += `\nRecent SMS Messages (Most Recent First):\n`;
      
      const recentSMS = smsLogs.slice(0, 5);
      recentSMS.forEach((sms, index) => {
        contextMessage += `--- SMS ${index + 1} ---\n`;
        contextMessage += `Date: ${sms.date_sent || 'N/A'}\n`;
        contextMessage += `Status: ${sms.send_status || 'N/A'}\n`;
        contextMessage += `Phone: ${sms.phone_number || 'N/A'}\n`;
        contextMessage += `Message: ${sms.message || 'N/A'}\n\n`;
      });
      
      if (smsLogs.length > 5) {
        contextMessage += `[... and ${smsLogs.length - 5} older SMS messages not shown]\n`;
      }
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add context as system message if available
    if (contextMessage) {
      messages.push({
        role: 'system',
        content: `ACCOUNT DATA AND HISTORY:\n${contextMessage}`
      });
    }

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 1,
      stream: false
    });

    return completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response. Please check your connection and try again.');
  }
}

/**
 * Generate account summary
 */
export async function generateAccountSummary(
  account: Account,
  notes: NoteHistory[]
): Promise<string> {
  const prompt = `Please provide a comprehensive summary of this account based on the historical notes including:
1. Key risk factors identified from the interaction history
2. Payment behavior patterns observed in the notes
3. Communication history summary (who contacted, when, outcomes)
4. Customer disposition/attitude observed
5. Recommended next actions based on history

Keep the summary focused and actionable.`;

  return generateAIResponse(prompt, account, notes, []);
}

/**
 * Generate suggested talking points for customer call
 */
export async function generateTalkingPoints(
  account: Account,
  notes: NoteHistory[]
): Promise<string> {
  const prompt = `Based on this customer's complete interaction history from the notes, please provide:
1. Key talking points for the next call
2. Previous commitments or promises made by the customer
3. Potential objections to prepare for (based on past interactions)
4. Compliance reminders specific to this case
5. Recommended tone and approach based on past interactions

Format as a brief call preparation guide.`;

  return generateAIResponse(prompt, account, notes, []);
}

/**
 * Analyze customer sentiment from notes
 */
export async function analyzeCustomerSentiment(
  account: Account,
  notes: NoteHistory[]
): Promise<string> {
  const prompt = `Analyze the customer's sentiment and disposition based on the interaction history:
1. Overall attitude trend (improving, declining, stable)
2. Key concerns expressed
3. Cooperation level
4. Communication preferences noted
5. Risk of escalation or complaint

Provide actionable insights for the agent.`;

  return generateAIResponse(prompt, account, notes, []);
}
