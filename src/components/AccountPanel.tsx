import { useState } from 'react';
import { ChevronRight, ChevronLeft, User, FileText, Tag, Clock, AlertCircle, Activity, Users, MessageSquare } from 'lucide-react';
import { Account, NoteHistory } from '../types';
import { RiskBadge } from './RiskBadge';
import { calculateRisk } from '../utils/riskLogic';

interface AccountPanelProps {
  account: Account | null;
  notes: NoteHistory[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AccountPanel({ account, notes, isCollapsed, onToggleCollapse }: AccountPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes'>('overview');

  if (!account) return null;

  const riskAssessment = calculateRisk(account.dpd, account.status);
  const riskLevel = riskAssessment.level;

  // Get unique agents
  const uniqueAgents = [...new Set(notes.map(n => n.owner).filter(Boolean))];
  
  // Get unique reasons
  const uniqueReasons = [...new Set(notes.map(n => n.reason).filter(Boolean))];
  
  // Get latest note
  const latestNote = notes[0];

  // Risk assessment text
  const getRiskAssessmentText = () => {
    if (riskLevel === 'CRITICAL') {
      return 'Immediate action required. Account at high risk of default or legal proceedings.';
    } else if (riskLevel === 'HIGH') {
      return 'Account requires priority attention. Increased monitoring recommended.';
    }
    return 'Account is within acceptable parameters. Standard monitoring applies.';
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-l border-slate-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          title="Expand panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[340px] bg-white border-l border-slate-200 flex flex-col">
      {/* Header with Account Summary */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900">{account.custnumber}</p>
              <p className="text-[11px] text-slate-500 font-mono">{account.accnumber}</p>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Collapse panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* DPD Badge */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-center border border-slate-200">
            <p className="text-[22px] font-bold text-slate-900">{account.dpd}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">DPD</p>
          </div>
          <RiskBadge dpd={account.dpd} status={account.status} size="sm" showIcon />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-2.5 text-[12px] font-semibold transition-all relative ${
            activeTab === 'overview'
              ? 'text-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Overview
          </span>
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-4 py-2.5 text-[12px] font-semibold transition-all relative ${
            activeTab === 'notes'
              ? 'text-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Notes
            <span className="ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">
              {notes.length}
            </span>
          </span>
          {activeTab === 'notes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' ? (
          <div className="p-4 space-y-4">
            {/* Risk Assessment */}
            <div className={`p-3 rounded-lg border ${
              riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-200' :
              riskLevel === 'HIGH' ? 'bg-amber-50 border-amber-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className={`w-3.5 h-3.5 ${
                  riskLevel === 'CRITICAL' ? 'text-red-600' :
                  riskLevel === 'HIGH' ? 'text-amber-600' :
                  'text-emerald-600'
                }`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  riskLevel === 'CRITICAL' ? 'text-red-700' :
                  riskLevel === 'HIGH' ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>Risk Assessment</span>
              </div>
              <p className={`text-[12px] leading-relaxed ${
                riskLevel === 'CRITICAL' ? 'text-red-700' :
                riskLevel === 'HIGH' ? 'text-amber-700' :
                'text-emerald-700'
              }`}>{getRiskAssessmentText()}</p>
            </div>

            {/* Metrics Grid */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Metrics</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Days Past Due</p>
                  <p className="text-[18px] font-bold text-slate-900 mt-0.5">{account.dpd}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Status</p>
                  <p className="text-[12px] font-semibold text-slate-700 mt-1">{account.status}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Last Contact</p>
                  <p className="text-[12px] font-semibold text-slate-700 mt-1">{latestNote?.notedate || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total Notes</p>
                  <p className="text-[18px] font-bold text-slate-900 mt-0.5">{notes.length}</p>
                </div>
              </div>
            </div>

            {/* Agents */}
            {uniqueAgents.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Agents</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueAgents.slice(0, 5).map((agent, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded border border-blue-100">
                      {agent}
                    </span>
                  ))}
                  {uniqueAgents.length > 5 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[11px] font-medium rounded">
                      +{uniqueAgents.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Contact Reasons */}
            {uniqueReasons.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Contact Reasons</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueReasons.slice(0, 4).map((reason, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-medium rounded border border-slate-200">
                      {reason}
                    </span>
                  ))}
                  {uniqueReasons.length > 4 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[11px] font-medium rounded">
                      +{uniqueReasons.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Latest Note Preview */}
            {latestNote && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Latest Note</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-slate-400">{latestNote.notedate}</span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] text-blue-600 font-medium">{latestNote.owner}</span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed line-clamp-3">
                    {latestNote.notemade}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Notes Tab */
          <div>
            {notes.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-[13px] font-medium text-slate-600">No notes found</p>
                <p className="text-[11px] text-slate-400 mt-1">No interaction history for this account</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notes.slice(0, 30).map((note) => (
                  <div key={note.id} className="p-4 hover:bg-slate-50 transition-all">
                    {/* Note Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-[12px] font-semibold text-slate-700">{note.owner || 'System'}</span>
                      </div>
                      {note.noteimp === 'Y' && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Important
                        </span>
                      )}
                    </div>

                    {/* Note Content */}
                    <p className="text-[12px] text-slate-600 leading-relaxed mb-2.5 line-clamp-3">
                      {note.notemade || 'No content'}
                    </p>

                    {/* Note Meta */}
                    <div className="flex flex-wrap gap-1.5">
                      {note.notedate && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          <Clock className="w-2.5 h-2.5" />
                          {note.notedate}
                        </span>
                      )}
                      {note.reason && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                          <Tag className="w-2.5 h-2.5" />
                          {note.reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {notes.length > 30 && (
                  <div className="p-3 text-center bg-slate-50">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Showing 30 of {notes.length} notes
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
