import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import {
  Archive,
  Folder,
  FolderOpen,
  Users,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Repeat,
  Calendar,
  TrendingUp,
  X
} from 'lucide-react';
import useWebSocket, { type WebSocketMessage } from '../hooks/useWebSocket';

interface SectionRecord {
  id: number;
  branch: string;
  section: string;
  academic_year: string;
  election_id: number | null;
  total_students: number;
  registered_candidates: number;
  approved_candidates: number;
  total_voters: number;
  registration_opened: string | null;
  registration_closed: string | null;
  election_started: string | null;
  election_ended: string | null;
  winner_name: string | null;
  winner_votes: number;
  runner_up_name: string | null;
  runner_up_votes: number;
  nota_votes: number;
  turnout_percentage: number;
  is_reopened: boolean;
  reopen_count: number;
  reopen_reason: string | null;
  last_reopen_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400',
    registration_open: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    election_active: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    completed: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
    reopened: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${styles[status] || styles.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const SectionRecords: React.FC = () => {
  const [records, setRecords] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<SectionRecord | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenDuration, setReopenDuration] = useState(60);
  const [reopening, setReopening] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await adminAPI.getSectionRecords(
        branchFilter !== 'all' ? branchFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setRecords(data.records || []);
    } catch (error) {
      console.error('Failed to fetch section records:', error);
    } finally {
      setLoading(false);
    }
  }, [branchFilter, statusFilter]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    // Refresh on all election events including vote_cast for real-time turnout updates
    if (['registration_reopened', 'election_started', 'election_stopped', 'vote_cast'].includes(message.type)) {
      fetchRecords();
    }
  }, [fetchRecords]);

  const { isConnected } = useWebSocket({
    isAdmin: true,
    enabled: true,
    onMessage: handleWebSocketMessage
  });

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Auto-refresh every 15 seconds to keep data in sync
  useEffect(() => {
    const interval = setInterval(fetchRecords, 15000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const handleReopen = async () => {
    if (!selectedRecord || !reopenReason.trim()) return;
    
    setReopening(true);
    try {
      await adminAPI.reopenSectionElection(selectedRecord.id, reopenReason.trim(), reopenDuration);
      setShowReopenModal(false);
      setReopenReason('');
      setReopenDuration(60);
      fetchRecords();
    } catch (error) {
      console.error('Failed to reopen election:', error);
    } finally {
      setReopening(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.academic_year.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === 'pending').length,
    registrationOpen: records.filter(r => r.status === 'registration_open').length,
    active: records.filter(r => r.status === 'election_active').length,
    completed: records.filter(r => r.status === 'completed').length,
    reopened: records.filter(r => r.is_reopened).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-zinc-600 dark:text-zinc-400 font-semibold">Loading section records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
              <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Election Records</h3>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Complete history and management of all section elections.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-full px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span className="text-xs font-bold">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <button onClick={fetchRecords} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-100 dark:bg-white/10 rounded-xl">
                <Folder className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Total</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-100 dark:bg-white/10 rounded-xl">
                <Clock className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Pending</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Reg. Open</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.registrationOpen}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Active</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Completed</p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                <Repeat className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Reopened</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.reopened}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by branch, section, or academic year..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="registration_open">Registration Open</option>
                <option value="election_active">Election Active</option>
                <option value="completed">Completed</option>
                <option value="reopened">Reopened</option>
              </select>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="all">All Branches</option>
                <option value="CSE">CSE</option>
                <option value="ISE">ISE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-white/10 p-5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    record.status === 'election_active' ? 'bg-emerald-100 dark:bg-emerald-500/20' :
                    record.status === 'registration_open' ? 'bg-blue-100 dark:bg-blue-500/20' :
                    record.is_reopened ? 'bg-amber-100 dark:bg-amber-500/20' :
                    'bg-zinc-100 dark:bg-white/10'
                  }`}>
                    {record.status === 'election_active' ? <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> :
                     record.status === 'registration_open' ? <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
                     record.is_reopened ? <Repeat className="w-5 h-5 text-amber-600 dark:text-amber-400" /> :
                     <Folder className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10 px-2 py-1 rounded-lg">
                        {record.branch} - {record.section}
                      </span>
                      <StatusBadge status={record.status} />
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">{record.academic_year}</h3>
                  </div>
                </div>
                {record.reopen_count > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Reopened</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">{record.reopen_count}x</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Students</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">{record.total_students}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Candidates</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">{record.approved_candidates}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Voters</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">{record.total_voters}</p>
                </div>
              </div>

              {record.turnout_percentage > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-medium mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Turnout</span>
                    <span className={`font-black ${
                      record.turnout_percentage >= 70 ? 'text-emerald-600' :
                      record.turnout_percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>{record.turnout_percentage}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        record.turnout_percentage >= 70 ? 'bg-emerald-500' :
                        record.turnout_percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${record.turnout_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {record.winner_name && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Winner</p>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{record.winner_name} ({record.winner_votes} votes)</p>
                    </div>
                  </div>
                </div>
              )}

              {record.reopen_reason && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">Reopen Reason</p>
                      <p className="text-xs text-amber-900 dark:text-amber-200">{record.reopen_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 dark:border-white/5">
                <button
                  onClick={() => setSelectedRecord(record)}
                  className="flex-1 text-xs font-bold py-2.5 px-3 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </button>
                {record.status !== 'completed' && (
                  <button
                    onClick={() => { setSelectedRecord(record); setShowReopenModal(true); }}
                    className="flex-1 text-xs font-bold py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-20">
            <Archive className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No section records found</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Records will appear here when elections are created</p>
          </div>
        )}
      </div>

      {/* Reopen Modal */}
      {showReopenModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowReopenModal(false)}>
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">Reopen Registration</h3>
              <button onClick={() => setShowReopenModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{selectedRecord.branch} - Section {selectedRecord.section}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Academic Year: {selectedRecord.academic_year}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Reason for Reopening *
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Describe what went wrong and why you need to reopen registration..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Registration Duration (minutes)
                </label>
                <input
                  type="number"
                  value={reopenDuration}
                  onChange={(e) => setReopenDuration(parseInt(e.target.value))}
                  min={15}
                  max={1440}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                  Registration window will be open for this duration
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowReopenModal(false)}
                  className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReopen}
                  disabled={reopening || !reopenReason.trim()}
                  className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {reopening ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                  {reopening ? 'Reopening...' : 'Reopen Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionRecords;
