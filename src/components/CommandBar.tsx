import { RefreshCw, Sparkles } from 'lucide-react';

interface CommandBarProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function CommandBar({ onRefresh, isRefreshing }: CommandBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Collections Dashboard</h2>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-md">
          <Sparkles className="w-3 h-3 text-blue-600" />
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">AI Powered</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
}
