import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import {
  Users, CheckCircle, TrendingUp, Clock, Award, Activity,
  PieChart, BarChart3, Calendar, XCircle, RefreshCw
} from 'lucide-react';
import Tooltip from './Tooltip';

interface ElectionAnalyticsProps {
  electionId: number;
  onClose: () => void;
}

interface AnalyticsData {
  election: {
    id: number;
    branch: string;
    section: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  };
  overview: {
    eligible_voters: number;
    actual_voters: number;
    non_voters: number;
    turnout_percentage: number;
    total_votes_cast: number;
    voting_rate_per_minute: number;
  };
  participation: {
    voted: number;
    did_not_vote: number;
    voted_percentage: number;
    did_not_vote_percentage: number;
  };
  candidates: Array<{
    id: number;
    name: string;
    usn: string;
    votes: number;
    percentage: number;
  }>;
  timeline: Array<{
    hour: number;
    votes: number;
  }>;
  peak_voting: {
    hour: number | null;
    votes: number;
  };
  summary: {
    winner: string;
    winner_votes: number;
    winner_percentage: number;
    total_candidates: number;
    election_status: string;
  };
}

const ElectionAnalytics: React.FC<ElectionAnalyticsProps> = ({ electionId, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [electionId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getElectionAnalytics(electionId);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-2xl max-w-6xl w-full p-12 text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-zinc-900 dark:text-white">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-auto border border-zinc-200 dark:border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#121214] border-b border-zinc-200 dark:border-white/10 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <PieChart className="w-7 h-7 text-blue-600" />
              Election Analytics
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {analytics.election.branch} - Section {analytics.election.section} | 
              {new Date(analytics.election.start_time).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Refresh">
              <button
                onClick={fetchAnalytics}
                className="p-2 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 rounded-lg transition"
              >
                <RefreshCw className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </Tooltip>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-100 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition"
            >
              <XCircle className="w-6 h-6 text-zinc-600 dark:text-zinc-400 hover:text-red-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Eligible Voters */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 rounded-2xl p-5 border border-blue-200 dark:border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Eligible Voters</span>
              </div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics.overview.eligible_voters}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Students in {analytics.election.branch}-{analytics.election.section}</p>
            </div>

            {/* Actual Voters */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Voted</span>
              </div>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{analytics.overview.actual_voters}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{analytics.participation.voted_percentage}% turnout</p>
            </div>

            {/* Did Not Vote */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/5 rounded-2xl p-5 border border-amber-200 dark:border-amber-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">Did Not Vote</span>
              </div>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{analytics.overview.non_voters}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{analytics.participation.did_not_vote_percentage}% abstained</p>
            </div>

            {/* Total Votes */}
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-500/10 dark:to-violet-500/5 rounded-2xl p-5 border border-violet-200 dark:border-violet-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase">Total Votes</span>
              </div>
              <p className="text-3xl font-bold text-violet-900 dark:text-violet-100">{analytics.overview.total_votes_cast}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">{analytics.overview.voting_rate_per_minute} votes/min</p>
            </div>
          </div>

          {/* Turnout Progress */}
          <div className="bg-zinc-50 dark:bg-white/5 rounded-2xl p-6 border border-zinc-200 dark:border-white/10">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Voter Turnout
            </h3>
            <div className="relative h-8 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-1000"
                style={{ width: `${analytics.participation.voted_percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Voted: {analytics.participation.voted_percentage}%
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                ✗ Did Not Vote: {analytics.participation.did_not_vote_percentage}%
              </span>
            </div>
          </div>

          {/* Candidate Performance */}
          <div className="bg-zinc-50 dark:bg-white/5 rounded-2xl p-6 border border-zinc-200 dark:border-white/10">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Candidate Performance
            </h3>
            <div className="space-y-4">
              {analytics.candidates.map((candidate, index) => (
                <div key={candidate.id}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 
                          ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' 
                          : 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {index === 0 ? '👑' : `#${index + 1}`}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{candidate.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{candidate.usn}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-zinc-900 dark:text-white">{candidate.votes} votes</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{candidate.percentage}%</p>
                    </div>
                  </div>
                  <div className="relative h-3 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${
                        index === 0 
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ width: `${candidate.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voting Timeline */}
          {analytics.timeline.length > 0 && (
            <div className="bg-zinc-50 dark:bg-white/5 rounded-2xl p-6 border border-zinc-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Voting Timeline
              </h3>
              <div className="flex items-end gap-2 h-40">
                {analytics.timeline.map((slot, idx) => {
                  const maxVotes = Math.max(...analytics.timeline.map(t => t.votes));
                  const height = (slot.votes / maxVotes) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-700 hover:to-blue-500"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {slot.hour}:00
                      </span>
                    </div>
                  );
                })}
              </div>
              {analytics.peak_voting.hour !== null && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Peak Voting Time:</strong> {analytics.peak_voting.hour}:00 with {analytics.peak_voting.votes} votes
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#09090B] rounded-xl p-4 border border-zinc-200 dark:border-white/10">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold mb-1">Winner</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-white truncate">{analytics.summary.winner}</p>
            </div>
            <div className="bg-white dark:bg-[#09090B] rounded-xl p-4 border border-zinc-200 dark:border-white/10">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold mb-1">Winner Votes</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{analytics.summary.winner_votes} ({analytics.summary.winner_percentage}%)</p>
            </div>
            <div className="bg-white dark:bg-[#09090B] rounded-xl p-4 border border-zinc-200 dark:border-white/10">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold mb-1">Total Candidates</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-white">{analytics.summary.total_candidates}</p>
            </div>
            <div className="bg-white dark:bg-[#09090B] rounded-xl p-4 border border-zinc-200 dark:border-white/10">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold mb-1">Duration</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-white">{analytics.election.duration_minutes} min</p>
            </div>
            <div className="bg-white dark:bg-[#09090B] rounded-xl p-4 border border-zinc-200 dark:border-white/10">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold mb-1">Status</p>
              <p className={`text-lg font-bold ${
                analytics.summary.election_status === 'completed' 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {analytics.summary.election_status === 'completed' ? '✓ Completed' : '⏳ Active'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionAnalytics;
