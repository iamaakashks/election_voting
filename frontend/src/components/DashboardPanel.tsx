import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import useWebSocket, { type WebSocketMessage } from '../hooks/useWebSocket';
import {
  Activity, Users, Award, RefreshCw, BarChart3, Zap, Eye, Download,
  Archive, Brain, Target, ArrowUpRight, X, CheckCircle2, Vote
} from 'lucide-react';

interface DashboardStats {
  total_elections: number;
  active_elections: number;
  upcoming_elections: number;
  completed_elections: number;
  total_students: number;
  total_voters: number;
  total_candidates: number;
  pending_approvals: number;
  system_status: string;
}

interface ElectionData {
  election_id: number;
  branch: string;
  section: string;
  status: string;
  votes_cast: number;
  turnout_percentage: number;
  leading_candidate: string | null;
}

interface ActivityItem {
  timestamp: string;
  activity_type: string;
  description: string;
  color: string;
}

const VoteTimelineChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-zinc-400">
        <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const maxVotes = Math.max(...data.map(d => d.votes), 1);

  return (
    <div className="h-48 flex items-end justify-between gap-2 px-4">
      {data.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-10">
            {point.votes} votes
          </div>
          <div
            className="w-full bg-blue-500 hover:bg-blue-400 rounded-t transition-all"
            style={{ height: `${(point.votes / maxVotes) * 160}px` }}
          />
          <span className="text-[9px] text-zinc-500 -rotate-45">{point.time}</span>
        </div>
      ))}
    </div>
  );
};

const CandidateBarChart = ({ candidates }: { candidates: any[] }) => {
  const maxVotes = Math.max(...candidates.map(c => c.votes), 1);

  return (
    <div className="space-y-3">
      {candidates.map((c, i) => (
        <div key={c.id || i} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{c.name}</span>
            <span className="font-bold text-blue-600">{c.percentage}%</span>
          </div>
          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${c.is_winner ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${(c.votes / maxVotes) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ candidates }: { candidates: any[] }) => {
  const total = candidates.reduce((sum, c) => sum + c.votes, 0) || 1;
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];
  let offset = 0;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        {candidates.map((c, i) => {
          const pct = (c.votes / total) * 100;
          const dash = `${pct} ${100 - pct}`;
          const circle = (
            <circle
              key={c.id || i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="12"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className="hover:opacity-80 transition-opacity"
            />
          );
          offset += pct;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black">{total}</span>
        <span className="text-[9px] text-zinc-500 uppercase">Votes</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  };

  return (
    <div className={`${colors[color]} border rounded-2xl p-5 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1.5">{title}</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs opacity-50 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white/50 dark:bg-white/5 p-2.5 rounded-xl">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const Modal = ({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-white/10">
        <h3 className="text-lg font-black">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 overflow-auto">{children}</div>
    </div>
  </div>
);

const DashboardPanel: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [elections, setElections] = useState<ElectionData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [candidateComparison, setCandidateComparison] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, electionsRes, activitiesRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getDashboardElections(),
        adminAPI.getRecentActivity(8)
      ]);
      setStats(statsRes.statistics);
      setElections(electionsRes.elections);
      setActivities(activitiesRes.activities);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeline = async (electionId: number) => {
    try {
      const data = await adminAPI.getVoteTimeline(electionId, 'hour');
      setTimelineData(data.data_points);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    }
  };

  const fetchComparison = async (electionId: number) => {
    try {
      const data = await adminAPI.getCandidateComparison(electionId);
      setCandidateComparison(data.candidates);
    } catch (error) {
      console.error('Failed to fetch comparison:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await adminAPI.getHistoricalData(20);
      setHistoricalData(data.elections);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleExport = async (electionId: number) => {
    try {
      const data = await adminAPI.downloadElectionCSV(electionId);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `election_${electionId}_results.csv`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (['vote_cast', 'election_started', 'election_stopped'].includes(message.type)) {
      fetchDashboardData();
    }
  }, []);

  const { isConnected } = useWebSocket({ isAdmin: true, enabled: true, onMessage: handleWebSocketMessage });

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { const interval = setInterval(fetchDashboardData, 10000); return () => clearInterval(interval); }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="font-medium">Loading...</p>
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
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Dashboard</h3>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Real-time election monitoring and analytics.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-full px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span className="text-xs font-bold">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <button onClick={fetchDashboardData} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active" value={stats?.active_elections || 0} subtitle={`${stats?.upcoming_elections || 0} upcoming`} icon={Activity} color="emerald" />
          <StatCard title="Voters" value={stats?.total_voters || 0} subtitle={`${stats?.total_students || 0} eligible`} icon={Users} color="blue" />
          <StatCard title="Candidates" value={stats?.total_candidates || 0} subtitle={`${stats?.pending_approvals || 0} pending`} icon={Award} color="purple" />
          <StatCard title="Completed" value={stats?.completed_elections || 0} subtitle="Total elections" icon={CheckCircle2} color="amber" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={() => { fetchHistory(); setShowHistoryModal(true); }} className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
            <Archive className="w-4 h-4" />
            <span className="font-bold text-sm">History</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
            <Download className="w-4 h-4" />
            <span className="font-bold text-sm">Export</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
            <Brain className="w-4 h-4" />
            <span className="font-bold text-sm">Analytics</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
            <Target className="w-4 h-4" />
            <span className="font-bold text-sm">Predictions</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Elections */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-blue-500 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black">Elections</h2>
                  <p className="text-xs text-zinc-500">{elections.length} total</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {elections.slice(0, 4).map((e) => (
                  <div key={e.election_id} className="bg-white dark:bg-[#121214] rounded-xl p-4 border border-zinc-200 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] font-black uppercase bg-zinc-200 dark:bg-white/10 px-2 py-1 rounded">{e.branch} - {e.section}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${e.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-zinc-500 text-white'}`}>
                        {e.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold">Turnout</span>
                      <span className={`text-lg font-black ${e.turnout_percentage >= 70 ? 'text-emerald-600' : e.turnout_percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {e.turnout_percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <div className={`h-full ${e.turnout_percentage >= 70 ? 'bg-emerald-500' : e.turnout_percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${e.turnout_percentage}%` }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedElectionId(e.election_id); fetchTimeline(e.election_id); setShowTimelineModal(true); }} className="flex-1 text-xs font-bold py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        Timeline
                      </button>
                      <button onClick={() => { setSelectedElectionId(e.election_id); fetchComparison(e.election_id); setShowComparisonModal(true); }} className="flex-1 text-xs font-bold py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                        Compare
                      </button>
                      <button onClick={() => handleExport(e.election_id)} className="p-2 bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 rounded-lg transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <div className="bg-zinc-50/50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10 p-5 sticky top-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-amber-500 rounded-xl">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black">Live Activity</h2>
                  <p className="text-xs text-zinc-500">Recent events</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {activities.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
                    <div className={`p-2 rounded-lg ${a.color === 'blue' ? 'bg-blue-500' : a.color === 'green' ? 'bg-green-500' : 'bg-emerald-500'}`}>
                      <Vote className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{a.description}</p>
                      <p className="text-[10px] text-zinc-500">{a.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTimelineModal && selectedElectionId && (
        <Modal onClose={() => setShowTimelineModal(false)} title="Vote Timeline">
          <VoteTimelineChart data={timelineData} />
        </Modal>
      )}

      {showComparisonModal && selectedElectionId && (
        <Modal onClose={() => setShowComparisonModal(false)} title="Candidate Comparison">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CandidateBarChart candidates={candidateComparison} />
            <DonutChart candidates={candidateComparison} />
          </div>
        </Modal>
      )}

      {showHistoryModal && (
        <Modal onClose={() => setShowHistoryModal(false)} title="Election History">
          <div className="overflow-auto max-h-96">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-white/5 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-black uppercase">Section</th>
                  <th className="text-center py-3 px-4 text-[10px] font-black uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-[10px] font-black uppercase">Votes</th>
                  <th className="text-center py-3 px-4 text-[10px] font-black uppercase">Turnout</th>
                  <th className="text-left py-3 px-4 text-[10px] font-black uppercase">Winner</th>
                </tr>
              </thead>
              <tbody>
                {historicalData.map((e: any) => (
                  <tr key={e.election_id} className="border-t border-zinc-100 dark:border-white/5">
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold">{e.branch} - {e.section}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${e.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-zinc-500 text-white'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-bold">{e.total_votes}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-black ${e.turnout_percentage >= 70 ? 'text-emerald-600' : e.turnout_percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {e.turnout_percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {e.winner ? <span className="text-sm font-bold">{e.winner}</span> : <span className="text-xs text-zinc-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DashboardPanel;
