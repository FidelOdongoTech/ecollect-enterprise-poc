import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Building2, FileText, MessageSquare } from 'lucide-react';
import { Account } from '../types';
import { RiskBadge } from './RiskBadge';
import { calculateRisk } from '../utils/riskLogic';

interface SidebarProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelectAccount: (account: Account) => void;
  isLoading?: boolean;
}

export function Sidebar({ accounts, selectedAccount, onSelectAccount, isLoading }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    critical: true,
    high: true,
    low: false
  });
  const [displayLimits, setDisplayLimits] = useState<Record<string, number>>({
    critical: 50,
    high: 50,
    low: 50
  });

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    const term = searchTerm.toLowerCase();
    return accounts.filter(
      acc =>
        acc.accnumber.toLowerCase().includes(term) ||
        acc.custnumber.toLowerCase().includes(term) ||
        acc.customerName.toLowerCase().includes(term)
    );
  }, [accounts, searchTerm]);

  const groupedAccounts = useMemo(() => {
    const groups = {
      critical: [] as Account[],
      high: [] as Account[],
      low: [] as Account[]
    };

    filteredAccounts.forEach(account => {
      const risk = calculateRisk(account.dpd, account.status);
      if (risk.level === 'CRITICAL') groups.critical.push(account);
      else if (risk.level === 'HIGH') groups.high.push(account);
      else groups.low.push(account);
    });

    return groups;
  }, [filteredAccounts]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const loadMore = (group: string) => {
    setDisplayLimits(prev => ({ ...prev, [group]: prev[group] + 50 }));
  };

  const renderAccountGroup = (
    title: string,
    groupKey: string,
    accounts: Account[],
    dotColor: string
  ) => {
    const isExpanded = expandedGroups[groupKey];
    const limit = displayLimits[groupKey];
    const displayedAccounts = accounts.slice(0, limit);
    const hasMore = accounts.length > limit;

    if (accounts.length === 0) return null;

    return (
      <div key={groupKey} className="mb-1">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(groupKey)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
            <span className="uppercase tracking-wider">{title}</span>
          </div>
          <span className="text-[10px] font-medium bg-slate-700/50 px-1.5 py-0.5 rounded">{accounts.length}</span>
        </button>

        {/* Account List */}
        {isExpanded && (
          <div className="mt-0.5 space-y-px px-2">
            {displayedAccounts.map(account => (
              <button
                key={account.id}
                onClick={() => onSelectAccount(account)}
                className={`w-full text-left px-3 py-2.5 rounded transition-all ${
                  selectedAccount?.id === account.id
                    ? 'bg-blue-600 shadow-lg shadow-blue-600/20'
                    : 'hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-medium truncate ${
                      selectedAccount?.id === account.id ? 'text-white' : 'text-slate-200'
                    }`}>
                      {account.customerName}
                    </p>
                    <p className={`text-[11px] truncate font-mono ${
                      selectedAccount?.id === account.id ? 'text-blue-200' : 'text-slate-500'
                    }`}>
                      {account.accnumber}
                    </p>
                    {/* Source & Counts */}
                    <div className="flex items-center gap-2 mt-1">
                      {account.noteCount > 0 && (
                        <span className={`inline-flex items-center gap-1 text-[10px] ${
                          selectedAccount?.id === account.id ? 'text-blue-200' : 'text-slate-500'
                        }`}>
                          <FileText className="w-3 h-3" />
                          {account.noteCount}
                        </span>
                      )}
                      {account.smsCount > 0 && (
                        <span className={`inline-flex items-center gap-1 text-[10px] ${
                          selectedAccount?.id === account.id ? 'text-blue-200' : 'text-slate-500'
                        }`}>
                          <MessageSquare className="w-3 h-3" />
                          {account.smsCount}
                        </span>
                      )}
                      {/* Source Badge */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-medium ${
                        account.source === 'both' 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : account.source === 'sms' 
                            ? 'bg-cyan-500/20 text-cyan-300' 
                            : 'bg-slate-600/30 text-slate-400'
                      }`}>
                        {account.source === 'both' ? 'Both' : account.source === 'sms' ? 'SMS' : 'Notes'}
                      </span>
                    </div>
                  </div>
                  <RiskBadge dpd={account.dpd} status={account.status} size="xs" />
                </div>
              </button>
            ))}

            {hasMore && (
              <button
                onClick={() => loadMore(groupKey)}
                className="w-full text-center py-2 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Show more ({accounts.length - limit})
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[280px] bg-slate-900 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Building2 className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">eCollect</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Enterprise</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Account Count & Summary */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Portfolios</span>
          <span className="text-[12px] font-semibold text-white">{accounts.length.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-400">
            <FileText className="w-3 h-3" />
            {accounts.filter(a => a.source === 'notes' || a.source === 'both').length}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <MessageSquare className="w-3 h-3" />
            {accounts.filter(a => a.source === 'sms' || a.source === 'both').length}
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            {accounts.filter(a => a.source === 'both').length} Both
          </span>
        </div>
      </div>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-slate-500 text-[13px]">No accounts found</p>
          </div>
        ) : (
          <>
            {renderAccountGroup('Critical', 'critical', groupedAccounts.critical, 'bg-red-500')}
            {renderAccountGroup('High Risk', 'high', groupedAccounts.high, 'bg-amber-500')}
            {renderAccountGroup('Standard', 'low', groupedAccounts.low, 'bg-emerald-500')}
          </>
        )}
      </div>

    </div>
  );
}
