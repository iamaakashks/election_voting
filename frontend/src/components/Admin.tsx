import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import {
  Plus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LayoutDashboard,
  CalendarDays,
  DoorOpen,
  DoorClosed,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  Search,
  FileText,
  KeyRound,
  LogOut,
  PieChart,
  SquareStop
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import ElectionAnalytics from './ElectionAnalytics';
import AlertModal, { Modal } from './AlertModal';
import Tooltip from './Tooltip';
import useWebSocket, { type WebSocketMessage } from '../hooks/useWebSocket';

interface Election {
  id: number;
  branch: string;
  section: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  status: string;
}

interface Candidate {
  id: number;
  name: string;
  usn: string;
  branch: string;
  section: string;
  manifesto: string;
  approved: boolean;
}

interface Student {
  id: number;
  usn: string;
  name: string;
  email: string;
  branch: string;
  section: string;
  year: number;
  has_voted: boolean;
  is_admin: boolean;
}

interface CandidatureWindow {
  id: number;
  start_time: string;
  end_time: string;
  time_remaining: number;
}

interface GlobalRegistrationWindow {
  id: number;
  start_time: string;
  end_time: string;
  time_remaining: number;
}

interface SectionOverride {
  id: number;
  branch: string;
  section: string;
  start_time: string;
  end_time: string;
  is_open: boolean;
  reason: string | null;
  time_remaining: number;
}

interface SectionCandidate {
  id: number;
  name: string;
  usn: string;
  email: string;
  year: number;
  manifesto: string;
  approved: boolean;
  reviewed?: boolean;
  election_id: number;
  created_at: string;
}

interface SectionGroup {
  branch: string;
  section: string;
  candidate_count: number;
  approved_count: number;
  pending_count: number;
  candidates: SectionCandidate[];
}

type SelectOption = string | { value: string; label: string };

const InputSelect = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: SelectOption[] }) => (
  <div className="flex flex-col">
    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-zinc-100 text-[15px] font-semibold rounded-xl px-4 py-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-500/40 transition-all cursor-pointer hover:border-zinc-400 dark:hover:border-white/20"
      >
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500 dark:text-zinc-400">
        <ChevronDown className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const InputNumber = ({ label, value, onChange, min, helpText }: { label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, min: number, helpText?: string }) => (
  <div className="flex flex-col">
    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
    <input
      type="number"
      value={value}
      onChange={onChange}
      min={min}
      className="w-full bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-zinc-100 text-[15px] font-semibold rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:ring-blue-500/40 transition-all hover:border-zinc-400 dark:hover:border-white/20"
    />
    {helpText && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{helpText}</p>}
  </div>
);

const Admin: React.FC = () => {
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  const [duration, setDuration] = useState(60);
  const [durationPreset, setDurationPreset] = useState('60');
  const [electionDuration, setElectionDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'election' | 'candidates' | 'students' | 'all-candidates'>('global');
  const [elections, setElections] = useState<Election[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [windowCandidates, setWindowCandidates] = useState<Candidate[]>([]);
  const [windowStatus, setWindowStatus] = useState<{ is_open: boolean; window: CandidatureWindow | null } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [globalWindowStatus, setGlobalWindowStatus] = useState<{ is_open: boolean; window: GlobalRegistrationWindow | null } | null>(null);
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState<number>(0);
  const [sectionOverrides, setSectionOverrides] = useState<SectionOverride[]>([]);
  const [showSectionOverride, setShowSectionOverride] = useState(false);
  const [overrideBranch, setOverrideBranch] = useState('CSE');
  const [overrideSection, setOverrideSection] = useState('A');
  const [overrideDuration, setOverrideDuration] = useState(60);
  const [overrideReason, setOverrideReason] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [sectionWiseCandidates, setSectionWiseCandidates] = useState<SectionGroup[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateFilterBranch, setCandidateFilterBranch] = useState<string>('all');
  const [studentFilterBranch, setStudentFilterBranch] = useState<string>('all');
  const [studentFilterSection, setStudentFilterSection] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [showForceStop, setShowForceStop] = useState(false);
  const [forceStopElectionId, setForceStopElectionId] = useState<number | null>(null);
  const [showAlert, setShowAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; onConfirm?: () => void } | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectCandidateId, setRejectCandidateId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const STUDENTS_PER_PAGE = 25;

  const fetchElections = useCallback(async () => {
    try {
      const data = await adminAPI.listElections();
      setElections(data.elections || []);
    } catch (err) {
      console.error('Failed to fetch elections', err);
    }
  }, []);

  const fetchPendingCandidates = useCallback(async () => {
    try {
      const data = await adminAPI.getPendingCandidates();
      setPendingCandidates(data.candidates || []);
    } catch (err) {
      console.error('Failed to fetch pending candidates', err);
    }
  }, []);

  const fetchWindowStatus = useCallback(async () => {
    try {
      const data = await adminAPI.getCandidatureWindowStatus(branch, section);
      setWindowStatus(data);
      if (data.is_open && data.window) setTimeRemaining(data.window.time_remaining);
    } catch (err) {
      console.error('Failed to fetch window status', err);
    }
  }, [branch, section]);

  const fetchGlobalRegistrationStatus = useCallback(async () => {
    try {
      const data = await adminAPI.getGlobalRegistrationStatus();
      setGlobalWindowStatus(data);
      if (data.is_open && data.window) setGlobalTimeRemaining(data.window.time_remaining);
    } catch (err) {
      console.error('Failed to fetch global registration status', err);
    }
  }, []);

  const fetchSectionOverrides = useCallback(async () => {
    try {
      const data = await adminAPI.listSectionOverrides();
      setSectionOverrides(data.overrides || []);
    } catch (err) {
      console.error('Failed to fetch section overrides', err);
    }
  }, []);

  const fetchSectionWiseCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const branchParam = candidateFilterBranch !== 'all' ? candidateFilterBranch : undefined;
      const data = await adminAPI.getSectionWiseCandidates(branchParam);
      setSectionWiseCandidates(data.sections || []);
    } catch (err) {
      console.error('Failed to fetch section-wise candidates', err);
    } finally {
      setCandidatesLoading(false);
    }
  }, [candidateFilterBranch]);

  // WebSocket for real-time admin updates
  const handleAdminWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('Admin received WebSocket message:', message);
    // Refresh relevant data based on message type
    if (message.type === 'vote_cast') {
      fetchElections();
    } else if (message.type === 'election_started' || message.type === 'election_stopped') {
      fetchElections();
      fetchGlobalRegistrationStatus();
    } else if (message.type === 'candidate_approved' || message.type === 'candidate_rejected' || message.type === 'candidate_registered') {
      fetchPendingCandidates();
      fetchSectionWiseCandidates();
    }
  }, [fetchElections, fetchGlobalRegistrationStatus, fetchPendingCandidates, fetchSectionWiseCandidates]);

  const { isConnected: adminWsConnected } = useWebSocket({
    isAdmin: true,
    enabled: true,
    onMessage: handleAdminWebSocketMessage
  });

  const fetchWindowCandidates = useCallback(async () => {
    try {
      const data = await adminAPI.getWindowCandidates(branch, section);
      setWindowCandidates(data.candidates || []);
    } catch (err) {
      console.error('Failed to fetch window candidates', err);
    }
  }, [branch, section]);

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const branchParam = studentFilterBranch !== 'all' ? studentFilterBranch : undefined;
      const sectionParam = studentFilterSection !== 'all' ? studentFilterSection : undefined;
      const skip = (currentPage - 1) * STUDENTS_PER_PAGE;
      const data = await adminAPI.listStudents(
        branchParam,
        sectionParam,
        debouncedSearch || undefined,
        skip,
        STUDENTS_PER_PAGE
      );
      setStudents(data.students || []);
      setTotalStudents(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setStudentsLoading(false);
    }
  }, [studentFilterBranch, studentFilterSection, debouncedSearch, currentPage]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(studentSearch);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [studentFilterBranch, studentFilterSection]);

  useEffect(() => {
    fetchElections();
    fetchPendingCandidates();
    fetchGlobalRegistrationStatus();
  }, [fetchElections, fetchPendingCandidates, fetchGlobalRegistrationStatus]);

  useEffect(() => {
    if (activeTab === 'global') {
      fetchGlobalRegistrationStatus();
      fetchSectionOverrides();
    }
    if (activeTab === 'all-candidates') {
      fetchSectionWiseCandidates();
    }
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, fetchGlobalRegistrationStatus, fetchSectionOverrides, fetchSectionWiseCandidates, fetchStudents]);

  // Polling fallback when WebSocket is unavailable
  useEffect(() => {
    if (adminWsConnected) return;
    const timer = setInterval(() => {
      fetchElections();
      if (activeTab === 'global') {
        fetchGlobalRegistrationStatus();
        fetchSectionOverrides();
      }
      if (activeTab === 'candidates') {
        fetchPendingCandidates();
      }
      if (activeTab === 'all-candidates') {
        fetchSectionWiseCandidates();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [
    adminWsConnected,
    activeTab,
    fetchElections,
    fetchGlobalRegistrationStatus,
    fetchSectionOverrides,
    fetchPendingCandidates,
    fetchSectionWiseCandidates
  ]);

  useEffect(() => {
    if (!windowStatus?.is_open || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { fetchWindowStatus(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [windowStatus?.is_open, timeRemaining, fetchWindowStatus]);

  useEffect(() => {
    if (!globalWindowStatus?.is_open || globalTimeRemaining <= 0) return;
    const timer = setInterval(() => {
      setGlobalTimeRemaining((prev) => {
        if (prev <= 1) { fetchGlobalRegistrationStatus(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [globalWindowStatus?.is_open, globalTimeRemaining, fetchGlobalRegistrationStatus]);

  const handleStartElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await adminAPI.createElection(branch, section, electionDuration);
      setShowAlert({
        type: 'success',
        title: 'Election Started',
        message: data.message + '\n\nCandidates: ' + (data.candidate_count || 0)
      });
      fetchElections();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to start election';

      // Show helpful hints based on error
      if (errorMsg.includes('Minimum 2 approved candidates')) {
        setShowAlert({
          type: 'warning',
          title: 'Insufficient Candidates',
          message: errorMsg + '\n\nPlease go to the "Approvals" tab to approve more candidates, or re-open registration to allow more students to register.'
        });
      } else if (errorMsg.includes('ZERO approved candidates')) {
        setShowAlert({
          type: 'warning',
          title: 'No Approved Candidates',
          message: errorMsg + '\n\nPlease go to the "Approvals" tab and approve at least one candidate first.'
        });
      } else if (errorMsg.includes('registration is still open')) {
        setShowAlert({
          type: 'warning',
          title: 'Registration Still Open',
          message: errorMsg + '\n\nPlease close the registration window first from the "Candidate Registration" tab.'
        });
      } else {
        setShowAlert({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    }
    finally { setLoading(false); }
  };

  const handleOpenWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.openCandidatureWindow(branch, section, duration);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Candidature window opened successfully.'
      });
      fetchWindowStatus();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to open candidature window.'
      });
    }
    finally { setLoading(false); }
  };

  const handleOpenGlobalRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.openGlobalRegistration(duration);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Global registration opened successfully.'
      });
      fetchGlobalRegistrationStatus();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to open global registration.'
      });
    }
    finally { setLoading(false); }
  };

  const handleCloseGlobalRegistration = async () => {
    setLoading(true);
    try {
      await adminAPI.closeGlobalRegistration();
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Global registration closed successfully.'
      });
      fetchGlobalRegistrationStatus();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to close global registration.'
      });
    }
    finally { setLoading(false); }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createSectionOverride(overrideBranch, overrideSection, overrideDuration, overrideReason || undefined);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Section override created successfully.'
      });
      fetchSectionOverrides();
      setOverrideReason('');
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to create section override.'
      });
    }
    finally { setLoading(false); }
  };

  const handleCloseOverride = async (branch: string, section: string) => {
    setLoading(true);
    try {
      await adminAPI.closeSectionOverride(branch, section);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Section override closed successfully.'
      });
      fetchSectionOverrides();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to close section override.'
      });
    }
    finally { setLoading(false); }
  };

  const openRejectReasonDialog = (candidateId: number) => {
    setRejectCandidateId(candidateId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const submitCandidateRejection = async () => {
    if (!rejectCandidateId) return;
    const reason = rejectReason.trim();
    if (reason.length < 8) {
      setShowAlert({
        type: 'warning',
        title: 'Reason Required',
        message: 'Please provide a clear rejection reason (at least 8 characters).'
      });
      return;
    }

    setSubmittingReject(true);
    try {
      await adminAPI.approveCandidate(rejectCandidateId, false, reason);
      setShowRejectModal(false);
      setRejectCandidateId(null);
      setRejectReason('');
      setShowAlert({
        type: 'success',
        title: 'Candidate Rejected',
        message: 'Candidate has been rejected and the clarification reason has been saved.'
      });
      fetchSectionWiseCandidates();
      fetchPendingCandidates();
      fetchWindowCandidates();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to reject candidate.'
      });
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleApproveFromSectionWise = async (candidateId: number, approved: boolean) => {
    if (!approved) {
      openRejectReasonDialog(candidateId);
      return;
    }

    try {
      await adminAPI.approveCandidate(candidateId, true);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Candidate approved successfully.'
      });
      fetchSectionWiseCandidates();
      fetchPendingCandidates();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to update candidate.'
      });
    }
  };

  const handleSystemReset = () => {
    setShowAlert({
      type: 'warning',
      title: 'Confirm System Reset',
      message:
        'This will permanently remove all votes, candidates, elections, and registration windows.\n\n' +
        'Student accounts will remain, but their vote status will be reset.\n\n' +
        'Do you want to continue?',
      onConfirm: async () => {
        setResetting(true);
        try {
          const data = await adminAPI.resetAllData();
          setShowAlert({
            type: 'success',
            title: 'System Reset Successful',
            message: data.message + '\n\n' +
              'Votes: deleted\n' +
              'Candidates: deleted\n' +
              'Elections: deleted\n' +
              'Registration windows: cleared\n' +
              'Student vote status: reset\n\n' +
              'You can now start fresh.'
          });
          // Refresh all data
          fetchElections();
          fetchPendingCandidates();
          fetchGlobalRegistrationStatus();
          fetchSectionOverrides();
          fetchSectionWiseCandidates();
        } catch (err: any) {
          setShowAlert({
            type: 'error',
            title: 'Reset Failed',
            message: err.response?.data?.detail || err.message || 'Reset failed'
          });
        } finally {
          setResetting(false);
        }
      }
    });
  };

  const handleForceStop = async () => {
    if (!forceStopElectionId) return;

    try {
      await adminAPI.forceStopElection(forceStopElectionId);
      setShowForceStop(false);
      setForceStopElectionId(null);
      setShowAlert({
        type: 'success',
        title: 'Election Stopped',
        message: 'Election stopped successfully!\n\nThe election has been permanently closed.'
      });
      fetchElections();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to stop election'
      });
    }
  };

  const handleCloseWindow = async () => {
    setLoading(true);
    try {
      await adminAPI.closeCandidatureWindow(branch, section);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Candidature window closed successfully.'
      });
      fetchWindowStatus();
      fetchWindowCandidates();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to close candidature window.'
      });
    }
    finally { setLoading(false); }
  };

  const handleApprove = async (id: number, approved: boolean) => {
    if (!approved) {
      openRejectReasonDialog(id);
      return;
    }

    try {
      await adminAPI.approveCandidate(id, true);
      setShowAlert({
        type: 'success',
        title: 'Success',
        message: 'Candidate approved successfully.'
      });
      fetchPendingCandidates();
      fetchSectionWiseCandidates();
      fetchWindowCandidates();
    } catch (err: any) {
      setShowAlert({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to update candidate.'
      });
    }
  };

  const formatTime = (totalSeconds: number) => {
    const secs = Math.floor(Math.max(0, totalSeconds));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleDurationPresetChange = (presetValue: string) => {
    setDurationPreset(presetValue);
    if (presetValue !== 'custom') {
      setDuration(parseInt(presetValue));
    }
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">Admin Panel</h1>
          <p className="text-base font-medium text-zinc-500 dark:text-zinc-400 mt-2">Manage elections, registrations, and candidate approvals.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-white/10 rounded-xl shadow-lg shadow-zinc-200/20 dark:shadow-none p-1.5 backdrop-blur-xl">
            <div className="px-4 py-1.5 flex items-center gap-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 border-r border-zinc-200 dark:border-white/10">
              <Activity className="w-4 h-4 text-blue-500" /> {elections.length} Active
            </div>
            <div className="px-4 py-1.5 flex items-center gap-2.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-200">
              <Users className="w-4 h-4 text-amber-500" /> {pendingCandidates.length} Pending
            </div>
          </div>
          <Tooltip content="Refresh Data">
            <button
              onClick={() => { fetchElections(); fetchGlobalRegistrationStatus(); fetchSectionOverrides(); }}
              className="p-3 bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300 rounded-xl shadow-lg shadow-zinc-200/20 dark:shadow-none hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Change Password">
            <button
              onClick={() => setShowChangePassword(true)}
              className="p-3 bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300 rounded-xl shadow-lg shadow-zinc-200/20 dark:shadow-none hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <KeyRound className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Reset All Data (Testing Only)">
            <button
              onClick={handleSystemReset}
              disabled={resetting}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {resetting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-zinc-200 dark:border-white/10 overflow-x-auto custom-scrollbar pb-px">
        {[
          { id: 'global', label: 'Candidate Registration', icon: DoorOpen },
          { id: 'all-candidates', label: 'All Candidates', icon: Users },
          { id: 'election', label: 'Voting Instances', icon: CalendarDays },
          { id: 'candidates', label: 'Approvals', icon: ShieldCheck, badge: pendingCandidates.length },
          { id: 'students', label: 'Students Directory', icon: GraduationCap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-5 py-3.5 text-[15px] font-bold border-b-2 transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' 
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-white/30'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center text-[11px] font-black px-2 py-0.5 rounded-md ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Configuration Form (Only for Global and Election) */}
        {(activeTab === 'global' || activeTab === 'election') && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xl shadow-zinc-200/40 dark:shadow-none p-6 lg:p-8">
              <div className="mb-8 pb-5 border-b border-zinc-100 dark:border-white/5">
                <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                  {activeTab === 'global' ? 'Candidate Registration' : 'Class Selection'}
                </h2>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
                  {activeTab === 'global' ? 'Open registration for all sections simultaneously.' : 'Select the branch and section.'}
                </p>
              </div>

              {activeTab === 'global' ? (
                <>
                  {globalWindowStatus?.is_open ? (
                    <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <DoorOpen className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Registration Open</h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400/80 font-mono font-bold mt-2 mb-6">{formatTime(globalTimeRemaining)} remaining</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400/70 font-medium mb-6">All sections can register candidates</p>
                      <button
                        onClick={handleCloseGlobalRegistration}
                        disabled={loading}
                        className="w-full px-5 py-3 bg-white dark:bg-[#121214] border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[15px] font-bold rounded-xl shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-200 focus:ring-2 focus:ring-emerald-500"
                      >
                        Close Registration
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleOpenGlobalRegistration} className="space-y-6">
                      <div className="flex items-center gap-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 mb-2 p-4 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10">
                        <DoorClosed className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        Registration currently closed.
                      </div>
                      <InputSelect
                        label="Duration"
                        value={durationPreset}
                        onChange={e => handleDurationPresetChange(e.target.value)}
                        options={[
                          { value: '60', label: '1 Hour' },
                          { value: '120', label: '2 Hours' },
                          { value: '480', label: '8 Hours' },
                          { value: '1440', label: '24 Hours' },
                          { value: 'custom', label: 'Custom' },
                        ]}
                      />
                      {durationPreset === 'custom' && (
                        <InputNumber
                          label="Custom Duration (Minutes)"
                          value={duration}
                          onChange={e => setDuration(parseInt(e.target.value) || 120)}
                          min={30}
                          helpText="Min 30 minutes, max 1440 minutes (24 hrs)."
                        />
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-blue-500/20 transition-all duration-200 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-[#09090B] focus:ring-blue-500 disabled:opacity-50 mt-4"
                      >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Open Registration
                      </button>
                      
                      {/* Something went wrong? Link */}
                      <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowSectionOverride(!showSectionOverride)}
                          className="w-full inline-flex items-center justify-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 group"
                        >
                          <AlertCircle className="w-4 h-4 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
                          <span>Something went wrong?</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSectionOverride ? 'rotate-180' : ''}`} />
                        </button>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 text-center leading-relaxed">
                          Use this if a specific section faced technical issues and needs separate registration access.
                        </p>
                      </div>
                    </form>
                  )}
                  
                  {/* Section Override Form (shown when "Something went wrong?" is clicked) */}
                  {showSectionOverride && (
                    <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 mb-5">
                        <div className="flex items-start gap-3 mb-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Section-Specific Override</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
                              Re-open registration for a specific section that experienced issues. This overrides the global setting.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <form onSubmit={handleCreateOverride} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <InputSelect label="Branch" value={overrideBranch} onChange={e => setOverrideBranch(e.target.value)} options={['CSE', 'ISE']} />
                          <InputSelect label="Section" value={overrideSection} onChange={e => setOverrideSection(e.target.value)} options={['A', 'B', 'C', 'D']} />
                        </div>
                        <InputNumber
                          label="Duration (Minutes)"
                          value={overrideDuration}
                          onChange={e => setOverrideDuration(parseInt(e.target.value) || 60)}
                          min={15}
                          helpText="Min 15 minutes"
                        />
                        <div className="flex flex-col">
                          <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Reason (Optional)</label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={e => setOverrideReason(e.target.value)}
                            placeholder="e.g., Network issues"
                            className="w-full bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-zinc-100 text-[14px] font-semibold rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:ring-amber-500/40 transition-all hover:border-zinc-400 dark:hover:border-white/20"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full inline-flex justify-center items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-[#09090B] focus:ring-amber-500 disabled:opacity-50"
                        >
                          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          Re-open for Section
                        </button>
                      </form>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleStartElection} className="space-y-6">
                  <div className="grid grid-cols-2 gap-5 mb-8">
                    <InputSelect label="Branch" value={branch} onChange={e => setBranch(e.target.value)} options={['CSE', 'ISE']} />
                    <InputSelect label="Section" value={section} onChange={e => setSection(e.target.value)} options={['A', 'B', 'C', 'D']} />
                  </div>
                  <InputNumber
                    label="Poll Duration (Minutes)"
                    value={electionDuration}
                    onChange={e => setElectionDuration(parseInt(e.target.value))}
                    min={5}
                    helpText="Standard voting window is 15 minutes."
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-xl text-[15px] font-bold shadow-lg shadow-blue-500/20 transition-all duration-200 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-[#09090B] focus:ring-blue-500 disabled:opacity-50 mt-4"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Start Election
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Right Column / Full Width: Data Tables */}
        <div className={(activeTab === 'candidates' || activeTab === 'students' || activeTab === 'all-candidates') ? 'lg:col-span-12' : 'lg:col-span-8'}>
          <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-xl shadow-zinc-200/40 dark:shadow-none overflow-hidden flex flex-col">

            {activeTab === 'all-candidates' && (
              <>
                <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">All Candidates (Section-wise)</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">View all registered candidates grouped by branch and section</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={candidateFilterBranch}
                      onChange={(e) => setCandidateFilterBranch(e.target.value)}
                      className="appearance-none text-sm font-semibold bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg px-3 py-2 pr-8 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    >
                      <option value="all">All Branches</option>
                      <option value="CSE">CSE</option>
                      <option value="ISE">ISE</option>
                    </select>
                    <Tooltip content="Refresh">
                      <button
                        onClick={fetchSectionWiseCandidates}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div className="overflow-auto">
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-32">
                      <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                  ) : sectionWiseCandidates.length === 0 ? (
                    <div className="text-center py-32">
                      <div className="inline-flex flex-col items-center text-zinc-400 dark:text-zinc-600">
                        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
                          <Users className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-base font-bold text-zinc-500 dark:text-zinc-400">No candidates found</p>
                        <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 mt-1">Candidates will appear here once registration opens</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-white/10">
                      {sectionWiseCandidates.map((sectionGroup) => (
                        <div key={`${sectionGroup.branch}-${sectionGroup.section}`} className="p-6">
                          {/* Section Header */}
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-black uppercase tracking-widest">
                                {sectionGroup.branch} - Section {sectionGroup.section}
                              </span>
                              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                {sectionGroup.candidate_count} candidates
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {sectionGroup.approved_count} Approved
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" /> {sectionGroup.pending_count} Pending
                              </span>
                            </div>
                          </div>

                          {/* Candidates Grid */}
                          <div className="grid gap-3">
                            {sectionGroup.candidates.map((candidate) => (
                              <div
                                key={candidate.id}
                                className="p-4 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#09090B] hover:border-blue-500 dark:hover:border-blue-400 transition-all"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                                        {candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                      </div>
                                      <div>
                                        <h4 className="text-base font-bold text-zinc-900 dark:text-white">{candidate.name}</h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{candidate.usn} - {candidate.email}</p>
                                      </div>
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                                        candidate.approved
                                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                          : candidate.reviewed
                                          ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                      }`}>
                                        {candidate.approved ? 'Approved' : candidate.reviewed ? 'Rejected' : 'Pending'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 italic bg-zinc-50 dark:bg-white/5 rounded-lg p-3 mt-2">
                                      "{candidate.manifesto}"
                                    </p>
                                  </div>
                                  {!candidate.approved && !candidate.reviewed && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Tooltip content="Approve">
                                        <button
                                          onClick={() => handleApproveFromSectionWise(candidate.id, true)}
                                          className="p-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/30 rounded-lg transition-all"
                                        >
                                          <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                      </Tooltip>
                                      <Tooltip content="Reject">
                                        <button
                                          onClick={() => handleApproveFromSectionWise(candidate.id, false)}
                                          className="p-2 bg-white dark:bg-[#121214] hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-zinc-200/80 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/30 rounded-lg transition-all"
                                        >
                                          <XCircle className="w-5 h-5" />
                                        </button>
                                      </Tooltip>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'global' && (
              <>
                <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent flex justify-between items-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Active Section Overrides</h3>
                  <span className="text-xs font-black uppercase tracking-widest bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-md">
                    {sectionOverrides.filter(o => o.is_open).length} Active
                  </span>
                </div>
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-zinc-50/80 dark:bg-white/[0.02] text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-extrabold border-b border-zinc-200 dark:border-white/10">
                      <tr>
                        <th className="px-6 py-4">Section</th>
                        <th className="px-6 py-4">Ends At</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">Time Remaining</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5 text-zinc-700 dark:text-zinc-300">
                      {sectionOverrides.filter(o => o.is_open).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-32 text-center">
                            <div className="inline-flex flex-col items-center text-zinc-400 dark:text-zinc-600">
                              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                              </div>
                              <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-200 mb-1">All Good!</p>
                              <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400">No section-specific overrides active. Global registration is working normally.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        sectionOverrides.filter(o => o.is_open).map(o => (
                          <tr key={o.id} className="hover:bg-zinc-50/90 dark:hover:bg-white/[0.02] transition-colors duration-200">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[13px] font-black uppercase tracking-widest">
                                {o.branch} - Sec {o.section}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-[13px] font-bold">
                              {new Date(o.end_time).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-[14px] italic max-w-md truncate">
                              {o.reason || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[13px]">
                                {formatTime(o.time_remaining)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleCloseOverride(o.branch, o.section)}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#121214] hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-zinc-200/80 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:outline-none shadow-sm"
                              >
                                <DoorClosed className="w-4 h-4" /> Close
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'election' && (
              <>
                <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Election History</h3>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Track election lifecycle, results, and verification from one place.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-md">
                        {elections.length} Total
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-md">
                        {elections.filter(e => e.status === 'active').length} Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 min-h-[500px]">
                  {elections.length === 0 ? (
                    <div className="h-full min-h-[420px] flex items-center justify-center">
                      <div className="inline-flex flex-col items-center text-zinc-400 dark:text-zinc-600">
                        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
                          <CalendarDays className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-base font-bold text-zinc-500 dark:text-zinc-400">No elections found</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {elections.map(e => (
                        <div key={e.id} className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#09090B] p-4 hover:border-zinc-300 dark:hover:border-white/20 transition-all">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                                e.status === 'active'
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                                  : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10'
                              }`}>
                                <CalendarDays className={`w-5 h-5 ${e.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                              </div>
                              <div>
                                <p className="font-extrabold text-zinc-900 dark:text-white text-[15px]">
                                  {e.branch} - Sec {e.section}
                                </p>
                                <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[12px] mt-1">
                                  Ends: {new Date(e.end_time).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                                e.status === 'active'
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20'
                                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                              }`}>
                                {e.status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10">
                            {e.status === 'active' ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <Tooltip content="Force Stop Election">
                                  <button
                                    onClick={() => { setForceStopElectionId(e.id); setShowForceStop(true); }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
                                  >
                                    <SquareStop className="w-3.5 h-3.5" /> Stop
                                  </button>
                                </Tooltip>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">Analytics and reports will unlock after this election ends.</span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <Tooltip content="View Analytics">
                                  <button
                                    onClick={() => { setSelectedElectionId(e.id); setShowAnalytics(true); }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all"
                                  >
                                    <PieChart className="w-3.5 h-3.5" /> Analytics
                                  </button>
                                </Tooltip>
                                <Tooltip content="Generate Result PDF">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const result = await adminAPI.generateResultPDF(e.id, 'Admin');
                                        setShowAlert({
                                          type: 'success',
                                          title: 'PDF Generated',
                                          message: 'PDF Generated!\n\nWinner: ' + (result.winner?.name || 'N/A') + '\nVotes: ' + (result.winner?.votes || 0) + '\n\nFile: ' + result.filename
                                        });
                                        // Download the PDF
                                        const pdfBlob = await adminAPI.downloadResultPDF(e.id);
                                        const url = window.URL.createObjectURL(pdfBlob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = result.filename;
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                      } catch (err: any) {
                                        setShowAlert({
                                          type: 'error',
                                          title: 'Error',
                                          message: err.response?.data?.detail || 'Failed to generate PDF'
                                        });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> PDF
                                  </button>
                                </Tooltip>
                                <Tooltip content="Verify Vote Chain Integrity">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const verification = await adminAPI.verifyElectionIntegrity(e.id);
                                        const chainStatus = verification.chain_verification;
                                        setShowAlert({
                                          type: chainStatus.valid ? 'success' : 'warning',
                                          title: 'Election Integrity Report',
                                          message: 'Status: ' + verification.integrity_status + '\n' +
                                            'Total Votes: ' + verification.total_votes + '\n' +
                                            'Vote Receipts: ' + verification.total_receipts + '\n' +
                                            'Chain Valid: ' + (chainStatus.valid ? 'Yes' : 'No') + '\n' +
                                            'Message: ' + chainStatus.message +
                                            (chainStatus.broken_links?.length > 0 ? '\n\nBroken Links:\n' + chainStatus.broken_links.map((l: any) => '  - Vote #' + l.vote_id + ': ' + l.reason).join('\n') : '')
                                        });
                                      } catch (err: any) {
                                        setShowAlert({
                                          type: 'error',
                                          title: 'Error',
                                          message: err.response?.data?.detail || 'Failed to verify'
                                        });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verify
                                  </button>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'candidates' && (
              <>
                <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent flex justify-between items-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Pending Approvals</h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Requires review
                  </span>
                </div>
                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-zinc-50/80 dark:bg-white/[0.02] text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-extrabold border-b border-zinc-200 dark:border-white/10">
                      <tr>
                        <th className="px-6 py-4">Candidate</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4 w-full">Manifesto</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5 text-zinc-700 dark:text-zinc-300">
                      {pendingCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-32 text-center">
                            <div className="inline-flex flex-col items-center text-zinc-400 dark:text-zinc-500">
                              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                              </div>
                              <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-200 mb-1">Queue is Clear</p>
                              <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400">All candidate registrations have been processed.</p>
                            </div>
                          </td>
                        </tr>
                      ) : pendingCandidates.map(c => (
                        <tr key={c.id} className="hover:bg-zinc-50/90 dark:hover:bg-white/[0.02] transition-colors duration-200">
                          <td className="px-6 py-4">
                            <p className="font-extrabold text-zinc-900 dark:text-white text-[15px]">{c.name}</p>
                            <p className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 font-mono mt-1">{c.usn}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[11px] font-black uppercase tracking-widest">
                              {c.branch} - {c.section}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-md truncate text-zinc-600 dark:text-zinc-400 italic font-medium text-[14px]" title={c.manifesto}>
                              "{c.manifesto}"
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                onClick={() => handleApprove(c.id, true)} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Approve
                              </button>
                              <button 
                                onClick={() => handleApprove(c.id, false)} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#121214] hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-zinc-200/80 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/30 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:outline-none shadow-sm"
                              >
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'students' && (() => {
              const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);
              return (
              <>
                <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Students Directory</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search name or USN..."
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 text-sm font-medium bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 w-56"
                        />
                      </div>
                      <select
                        value={studentFilterBranch}
                        onChange={e => setStudentFilterBranch(e.target.value)}
                        className="appearance-none text-sm font-semibold bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg px-3 py-2 pr-8 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                      >
                        <option value="all">All Branches</option>
                        {['CSE', 'ISE'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <select
                        value={studentFilterSection}
                        onChange={e => setStudentFilterSection(e.target.value)}
                        className="appearance-none text-sm font-semibold bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg px-3 py-2 pr-8 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                      >
                        <option value="all">All Sections</option>
                        {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="text-xs font-black uppercase tracking-widest bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md">
                        {totalStudents} Students
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {studentsLoading ? (
                    <div className="flex items-center justify-center py-32">
                      <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                  ) : (
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-zinc-50/80 dark:bg-white/[0.02] text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-extrabold border-b border-zinc-200 dark:border-white/10">
                        <tr>
                          <th className="px-6 py-4">USN</th>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Class</th>
                          <th className="px-6 py-4">Year</th>
                          <th className="px-6 py-4 text-right">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5 text-zinc-700 dark:text-zinc-300">
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-32 text-center">
                              <div className="inline-flex flex-col items-center text-zinc-400 dark:text-zinc-600">
                                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                  <GraduationCap className="w-8 h-8 opacity-50" />
                                </div>
                                <p className="text-base font-bold text-zinc-500 dark:text-zinc-400">No students found</p>
                                <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 mt-1">Try adjusting your filters.</p>
                              </div>
                            </td>
                          </tr>
                        ) : students.map(s => (
                          <tr key={s.id} className="hover:bg-zinc-50/90 dark:hover:bg-white/[0.02] transition-colors duration-200">
                            <td className="px-6 py-4 font-mono text-[13px] font-bold text-zinc-600 dark:text-zinc-300">{s.usn}</td>
                            <td className="px-6 py-4 font-extrabold text-zinc-900 dark:text-white text-[15px]">{s.name}</td>
                            <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-[14px] font-medium">{s.email}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[11px] font-black uppercase tracking-widest">
                                {s.branch} - {s.section}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 font-semibold">{s.year}</td>
                            <td className="px-6 py-4 text-right">
                              {s.is_admin ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200/80 dark:border-violet-500/20">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-zinc-50 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
                                  Student
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Showing <span className="font-bold text-zinc-800 dark:text-zinc-200">{(currentPage - 1) * STUDENTS_PER_PAGE + 1}</span> - <span className="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(currentPage * STUDENTS_PER_PAGE, totalStudents)}</span> of <span className="font-bold text-zinc-800 dark:text-zinc-200">{totalStudents}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                              currentPage === page
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                : 'bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          userEmail="admin@nie.edu.in"
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {/* Election Analytics Modal */}
      {showAnalytics && selectedElectionId && (
        <ElectionAnalytics
          electionId={selectedElectionId}
          onClose={() => { setShowAnalytics(false); setSelectedElectionId(null); }}
        />
      )}

      {/* Reject Candidate Modal */}
      {showRejectModal && (
        <Modal isOpen={showRejectModal} onClose={() => { if (!submittingReject) setShowRejectModal(false); }} title="Reject Candidate Request">
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Please provide a short and clear rejection reason. This clarification will be shown to the student.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Example: Manifesto is too short and does not explain your plans for the class."
              rows={4}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-zinc-400 dark:placeholder-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Minimum 8 characters. Current: {rejectReason.trim().length}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={submittingReject}
                className="flex-1 bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 rounded-lg font-semibold hover:bg-zinc-200 dark:hover:bg-white/20 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCandidateRejection}
                disabled={submittingReject || rejectReason.trim().length < 8}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {submittingReject ? 'Submitting...' : 'Reject with Reason'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Force Stop Confirmation Modal */}
      <AlertModal
        isOpen={showForceStop}
        type="warning"
        title="Force Stop Election"
        message={
          <div className="text-left space-y-3">
            <p className="font-bold text-red-600">This action is IRREVERSIBLE!</p>
            <p>Are you sure you want to stop this election immediately?</p>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 text-sm">
              <p className="font-bold text-amber-800 dark:text-amber-300">Consequences:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
                <li>Election will end immediately</li>
                <li>No more votes can be cast</li>
                <li>Current results will be final</li>
                <li>This cannot be undone</li>
              </ul>
            </div>
          </div>
        }
        onConfirm={handleForceStop}
        onClose={() => { setShowForceStop(false); setForceStopElectionId(null); }}
        confirmText="Stop Election"
        cancelText="Cancel"
        isLoading={loading}
      />

      {/* Alert Modal */}
      {showAlert && (
        <AlertModal
          isOpen={true}
          type={showAlert.type}
          title={showAlert.title}
          message={showAlert.message}
          onConfirm={showAlert.onConfirm}
          onClose={() => setShowAlert(null)}
          confirmText={showAlert.onConfirm ? 'Confirm' : 'OK'}
          cancelText={showAlert.onConfirm ? 'Cancel' : undefined}
        />
      )}
    </div>
  );
};

export default Admin;

