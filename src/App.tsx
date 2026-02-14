import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandBar } from './components/CommandBar';
import { ChatInterface } from './components/ChatInterface';
import { AccountPanel } from './components/AccountPanel';
import { Account, NoteHistory, SMSLog } from './types';
import { fetchAccounts, fetchNoteHistory, fetchSMSLogs } from './services/dataService';

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [noteHistory, setNoteHistory] = useState<NoteHistory[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  const loadAccounts = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const data = await fetchAccounts();
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0]);
      }
    } catch (err) {
      setError('Unable to connect to database');
      console.error('Error loading accounts:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchNoteHistory(selectedAccount.accnumber).then(setNoteHistory);
      fetchSMSLogs(selectedAccount.custnumber).then(setSmsLogs);
    }
  }, [selectedAccount]);

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="w-10 h-10 border-[3px] border-slate-200 rounded-full"></div>
            <div className="w-10 h-10 border-[3px] border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <p className="text-slate-600 mt-4 text-sm font-medium tracking-tight">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-lg font-bold">!</span>
          </div>
          <h2 className="text-slate-900 text-base font-semibold text-center mb-1">Connection Failed</h2>
          <p className="text-slate-500 text-sm text-center mb-6">{error}</p>
          <button
            onClick={() => loadAccounts()}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden antialiased">
      {/* Sidebar */}
      <Sidebar
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        isLoading={isRefreshing}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <CommandBar 
          onRefresh={() => loadAccounts(true)}
          isRefreshing={isRefreshing}
        />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-slate-200">
            <ChatInterface
              account={selectedAccount}
              notes={noteHistory}
              smsLogs={smsLogs}
            />
          </div>

          {/* Account Details Panel */}
          <AccountPanel
            account={selectedAccount}
            notes={noteHistory}
            smsLogs={smsLogs}
            isCollapsed={isPanelCollapsed}
            onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          />
        </div>
      </div>

    </div>
  );
}

export default App;
