import React, { useState, useEffect, useCallback } from 'react';
import {
  electionsAPI,
  candidateAPI,
  adminAPI,
  Candidate,
  Election,
  CandidateRegistrationStatusResponse,
  VoteReceiptVerificationResponse,
  VoteReceiptVerificationStep,
  VoteReceiptVerificationSummary,
} from '../services/api';
import { Vote, Users, Timer, AlertCircle, CheckCircle, FileText, XCircle, LogOut, User, ShieldAlert, KeyRound, ThumbsDown, ClipboardCopy, ShieldCheck, Hash, Link2, Lock, EyeOff, Database } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import AlertModal, { Modal } from './AlertModal';
import Tooltip from './Tooltip';
import useWebSocket, { type WebSocketMessage } from '../hooks/useWebSocket';

interface Student {
  usn: string;
  email: string;
  name: string;
  branch: string;
  section: string;
  is_admin: boolean;
  has_voted: boolean;
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

interface StudentProfileProps {
  student: Student;
  onLogout: () => void;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const normalize = (input: string): string => input.replace(/^\s*Error:\s*/i, '').trim();

  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { detail?: unknown } };
      message?: unknown;
    };
    if (typeof maybeError.response?.data?.detail === 'string') {
      return normalize(maybeError.response.data.detail);
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      if (maybeError.message.includes('Network Error')) {
        return 'Unable to connect to the server. Please check your connection and try again.';
      }
      if (maybeError.message.toLowerCase().includes('timeout')) {
        return 'The server took too long to respond. Please try again.';
      }
      return normalize(maybeError.message);
    }
  }
  if (error instanceof Error && error.message) return normalize(error.message);
  return fallback;
};

const normalizeApiTimestamp = (value: string): string =>
  /([zZ]|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;

const isTransportError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { response?: unknown; code?: unknown; message?: unknown };
  if (maybeError.response) return false;
  if (maybeError.code === 'ECONNABORTED') return true;
  if (typeof maybeError.message === 'string') {
    const msg = maybeError.message.toLowerCase();
    return msg.includes('network error') || msg.includes('timeout');
  }
  return false;
};

const StudentProfile: React.FC<StudentProfileProps> = ({ student, onLogout }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [voted, setVoted] = useState(student.has_voted);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [manifesto, setManifesto] = useState('');
  const [windowStatus, setWindowStatus] = useState<{ is_open: boolean; window: CandidatureWindow | null } | null>(null);
  const [windowTimeRemaining, setWindowTimeRemaining] = useState<number>(0);
  const [globalRegistrationStatus, setGlobalRegistrationStatus] = useState<{ is_open: boolean; window: GlobalRegistrationWindow | null } | null>(null);
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState<number>(0);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null | undefined>(undefined);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [voteReceiptCode, setVoteReceiptCode] = useState('');
  const [verifyReceiptInput, setVerifyReceiptInput] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingReceipt, setVerifyingReceipt] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<VoteReceiptVerificationStep[]>([]);
  const [showVerificationSteps, setShowVerificationSteps] = useState(false);
  const [verificationSummary, setVerificationSummary] = useState<VoteReceiptVerificationSummary | null>(null);
  const [lastVerificationResult, setLastVerificationResult] = useState<VoteReceiptVerificationResponse | null>(null);
  const [candidateRegistrationStatus, setCandidateRegistrationStatus] = useState<CandidateRegistrationStatusResponse>({
    is_registered: false,
    status: 'not_registered',
    candidate_id: null,
    message: 'You have not registered as a candidate yet.',
    rejection_reason: null
  });
  const [showAlert, setShowAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string | React.ReactNode;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const latestReceiptStorageKey = `vote_receipt_${student.usn}_latest`;

  const formatDateTime = (isoDate: string) => {
    const date = new Date(normalizeApiTimestamp(isoDate));
    if (Number.isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  };

  const loadStoredReceiptCode = useCallback((electionId?: number | null): string => {
    if (electionId) {
      const electionScopedKey = `vote_receipt_${student.usn}_${electionId}`;
      const electionScoped = localStorage.getItem(electionScopedKey);
      if (electionScoped) return electionScoped;
    }
    return localStorage.getItem(latestReceiptStorageKey) || '';
  }, [latestReceiptStorageKey, student.usn]);

  const saveReceiptCode = useCallback((receiptCode: string, electionId?: number | null) => {
    if (!receiptCode) return;
    localStorage.setItem(latestReceiptStorageKey, receiptCode);
    if (electionId) {
      localStorage.setItem(`vote_receipt_${student.usn}_${electionId}`, receiptCode);
    }
  }, [latestReceiptStorageKey, student.usn]);

  const fetchGlobalRegistrationStatus = useCallback(async () => {
    try {
      const data = await adminAPI.getGlobalRegistrationStatus();
      setGlobalRegistrationStatus(data);
      if (data.is_open && data.window) {
        setGlobalTimeRemaining(data.window.time_remaining);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch global registration status:', err);
    }
  }, []);

  const fetchWindowStatus = useCallback(async () => {
    try {
      const data = await adminAPI.getCandidatureWindowStatus(student.branch, student.section);
      setWindowStatus(data);
      if (data.is_open && data.window) {
        setWindowTimeRemaining(data.window.time_remaining);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch window status:', err);
    }
  }, [student.branch, student.section]);

  const fetchCandidateRegistrationStatus = useCallback(async () => {
    try {
      const data = await candidateAPI.getStatus(student.usn);
      setCandidateRegistrationStatus(data);
    } catch (err: unknown) {
      console.error('Failed to fetch candidate registration status:', err);
    }
  }, [student.usn]);

  const fetchActiveElection = useCallback(async () => {
    try {
      const data = await electionsAPI.getActiveElection(student.branch, student.section);
      setElection(data.election);
      setCandidates(data.candidates || []);
      if (data.election) {
        setTimeRemaining(data.election.time_remaining);
      }
    } catch (err: unknown) {
      console.error('Error fetching election:', err);
    }
  }, [student.branch, student.section]);

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('Student received WebSocket message:', message);
    if (
      message.type === 'vote_cast' ||
      message.type === 'election_started' ||
      message.type === 'election_stopped' ||
      message.type === 'candidate_approved' ||
      message.type === 'candidate_rejected' ||
      message.type === 'candidate_registered'
    ) {
      fetchActiveElection();
      fetchCandidateRegistrationStatus();
    }
  }, [fetchActiveElection, fetchCandidateRegistrationStatus]);

  const { isConnected: wsConnected } = useWebSocket({
    electionId: election?.id,
    enabled: true,
    onMessage: handleWebSocketMessage
  });

  useEffect(() => {
    fetchGlobalRegistrationStatus();
    fetchWindowStatus();
    fetchActiveElection();
    fetchCandidateRegistrationStatus();
  }, [fetchGlobalRegistrationStatus, fetchWindowStatus, fetchActiveElection, fetchCandidateRegistrationStatus]);

  useEffect(() => {
    const stored = loadStoredReceiptCode(election?.id);
    if (stored) {
      setVoteReceiptCode(stored);
      setVerifyReceiptInput(stored);
    }
  }, [election?.id, loadStoredReceiptCode]);

  // Polling fallback when WebSocket is unavailable
  useEffect(() => {
    if (wsConnected) return;
    const timer = setInterval(() => {
      fetchActiveElection();
      fetchWindowStatus();
      fetchGlobalRegistrationStatus();
      fetchCandidateRegistrationStatus();
    }, 5000);
    return () => clearInterval(timer);
  }, [wsConnected, fetchActiveElection, fetchWindowStatus, fetchGlobalRegistrationStatus, fetchCandidateRegistrationStatus]);

  useEffect(() => {
    if (!election || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setElection(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [election, timeRemaining]);

  useEffect(() => {
    if (!windowStatus?.is_open || windowTimeRemaining <= 0) return;
    const timer = setInterval(() => {
      setWindowTimeRemaining((prev) => {
        if (prev <= 1) {
          fetchWindowStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [windowStatus?.is_open, windowTimeRemaining, fetchWindowStatus]);

  useEffect(() => {
    if (!globalRegistrationStatus?.is_open || globalTimeRemaining <= 0) return;
    const timer = setInterval(() => {
      setGlobalTimeRemaining((prev) => {
        if (prev <= 1) {
          fetchGlobalRegistrationStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [globalRegistrationStatus?.is_open, globalTimeRemaining, fetchGlobalRegistrationStatus]);

  // Format time properly: "14:32" or "1:05:30" for hours
  const formatTimeRemaining = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyReceiptToClipboard = async (receiptCode: string) => {
    if (!receiptCode) return;
    try {
      await navigator.clipboard.writeText(receiptCode);
      setShowAlert({
        type: 'success',
        title: 'Receipt Code Copied',
        message: 'Your vote receipt code has been copied. Keep it safe to verify your vote later.'
      });
    } catch {
      setShowAlert({
        type: 'warning',
        title: 'Copy Not Available',
        message: 'Please copy this code manually and keep it safe.'
      });
    }
  };

  const verifyVoteByReceipt = async (receiptCode?: string) => {
    const code = (receiptCode ?? verifyReceiptInput).trim().toUpperCase();

    if (!code) {
      setShowAlert({
        type: 'warning',
        title: 'Enter Receipt Code',
        message: 'Please enter your vote receipt code to verify your vote.'
      });
      return;
    }

    setVerifyingReceipt(true);
    setVerificationSteps([]);
    setVerificationSummary(null);
    setLastVerificationResult(null);
    setShowVerificationSteps(true);
    try {
      const verification = await electionsAPI.verifyVoteReceipt(code);
      
      // Store verification steps for display
      if (verification.verification_steps) {
        setVerificationSteps(verification.verification_steps);
      }
      
      // Store summary for display
      if (verification.summary) {
        setVerificationSummary(verification.summary);
      }
      
      setVoteReceiptCode(verification.receipt_code);
      setVerifyReceiptInput(verification.receipt_code);
      saveReceiptCode(verification.receipt_code, verification.election.id);
      setLastVerificationResult(verification);
    } catch (err: any) {
      // Extract verification steps from error response if available
      if (err.response?.data?.verification_steps) {
        setVerificationSteps(err.response.data.verification_steps);
      }
      if (err.response?.data?.summary) {
        setVerificationSummary(err.response.data.summary);
      }
      setShowAlert({
        type: 'error',
        title: 'Verification Failed',
        message: getApiErrorMessage(err, 'We could not verify this receipt code. Please check the code and try again.')
      });
    } finally {
      setVerifyingReceipt(false);
    }
  };

  const handleRegisterCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manifesto.length < 10) {
      setShowAlert({
        type: 'error',
        title: 'Invalid Manifesto',
        message: 'Manifesto must be at least 10 characters long.'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await candidateAPI.register(student.usn, manifesto);
      await fetchCandidateRegistrationStatus();
      if (response.status === 'already_registered' || response.status === 'already_approved') {
        setShowAlert({
          type: 'info',
          title: 'Already Registered',
          message: `${response.message}\n\n${response.note}`
        });
      } else if (response.status === 'already_rejected') {
        setShowAlert({
          type: 'warning',
          title: 'Registration Already Reviewed',
          message: `${response.message}\n\n${response.note}`
        });
      } else {
        setShowAlert({
          type: 'success',
          title: 'Registration Successful',
          message: 'Your candidacy has been submitted.\n\nIt is now pending admin approval.'
        });
      }
      setShowRegisterForm(false);
      setManifesto('');
    } catch (err: unknown) {
      if (isTransportError(err)) {
        try {
          const latestStatus = await candidateAPI.getStatus(student.usn);
          setCandidateRegistrationStatus(latestStatus);
          if (latestStatus.is_registered) {
            setShowRegisterForm(false);
            setManifesto('');
            setShowAlert({
              type: latestStatus.status === 'rejected' ? 'warning' : 'success',
              title: latestStatus.status === 'rejected' ? 'Registration Already Reviewed' : 'Registration Successful',
              message:
                latestStatus.status === 'rejected'
                  ? latestStatus.message
                  : 'Your candidacy has been submitted.\n\nThe action completed, but the server response was delayed.'
            });
            return;
          }
        } catch {
          // Fall through to regular error handling.
        }
      }
      setShowAlert({
        type: 'error',
        title: 'Registration Failed',
        message: getApiErrorMessage(err, 'Failed to register as candidate.')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoteClick = (candidateId: number | null) => {
    setSelectedCandidateId(candidateId);
  };

  const confirmVote = async () => {
    if (!election) return;

    const isNota = selectedCandidateId === null;

    setShowAlert({
      type: 'confirm',
      title: 'Final Confirmation',
      message: (
        <div className="text-left space-y-3">
          <p className="font-bold">You are about to cast your vote{isNota ? ' for NOTA' : ''}.</p>
          <div className="bg-zinc-100 dark:bg-white/10 rounded-lg p-3 text-sm space-y-2">
            <p>- This action <strong className="text-red-600">cannot</strong> be undone</p>
            <p>- Your vote remains <strong className="text-emerald-600">anonymous</strong></p>
            <p>- You can vote <strong className="text-blue-600">only once</strong></p>
            {isNota && <p className="text-amber-600">- You are selecting "None of the Above (NOTA)"</p>}
          </div>
          <p className="font-bold">Are you sure you want to proceed?</p>
        </div>
      ),
      confirmText: 'Cast My Vote',
      cancelText: 'Go Back',
      onConfirm: async () => {
        setLoading(true);
        try {
          const voteResponse = await electionsAPI.castVote(election.id, selectedCandidateId || undefined, student.usn, isNota);
          const receiptCode = voteResponse.receipt_code;
          setVoteReceiptCode(receiptCode);
          setVerifyReceiptInput(receiptCode);
          saveReceiptCode(receiptCode, election.id);
          setSelectedCandidateId(undefined);
          setVoted(true);

          setShowAlert({
            type: 'success',
            title: 'Vote Recorded Successfully',
            message: (
              <div className="text-left space-y-3">
                <p>Your vote has been securely recorded{isNota ? ' as NOTA' : ''}.</p>
                <div className="bg-zinc-100 dark:bg-white/10 rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">Vote Receipt Code</p>
                  <p className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300">{receiptCode}</p>
                </div>
                <p className="text-sm">Save this code. You can use it anytime to confirm your vote was counted.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyReceiptToClipboard(receiptCode)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-200 text-sm font-semibold"
                  >
                    <ClipboardCopy className="w-4 h-4" />
                    Copy Code
                  </button>
                  <button
                    onClick={() => {
                      setVerifyReceiptInput(receiptCode);
                      setShowVerifyModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify Now
                  </button>
                </div>
              </div>
            )
          });
        } catch (err: unknown) {
          setShowAlert({
            type: 'error',
            title: 'Voting Failed',
            message: getApiErrorMessage(err, 'Failed to cast vote. Please try again.')
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const totalVerificationChecks = verificationSteps.length;
  const passedVerificationChecks = verificationSteps.filter((step) => step.status === 'success').length;
  const countedFlowSteps = verificationSteps.filter((step) => [2, 3, 9].includes(step.step));
  const tamperFlowSteps = verificationSteps.filter((step) => [4, 7, 8].includes(step.step));
  const shortVoteHash = lastVerificationResult?.vote_hash
    ? `${lastVerificationResult.vote_hash.slice(0, 18)}...${lastVerificationResult.vote_hash.slice(-10)}`
    : null;

  if (voted) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-[#121214] p-12 rounded-xl shadow-md text-center border border-emerald-200 dark:border-emerald-500/20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">Vote Submitted Successfully</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">
            Your vote for <span className="font-semibold">{student.branch} Section {student.section}</span> has been recorded.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Your choice stays anonymous and cannot be traced back to you.</p>
          <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              You cannot vote again. Your vote has been locked.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-200 dark:hover:bg-white/20 transition flex items-center gap-2 mx-auto"
          >
            <LogOut className="w-4 h-4" />
            Back to Student Selection
          </button>
        </div>

        <div className="bg-white dark:bg-[#121214] p-6 rounded-xl shadow-md border border-zinc-200 dark:border-white/10">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Verify That Your Vote Was Counted</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Use your receipt code to verify that your vote is included in the final tally while keeping your identity private.
          </p>

          {voteReceiptCode ? (
            <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 font-bold">Your Receipt Code</p>
              <p className="font-mono text-xl font-black text-blue-700 dark:text-blue-300">{voteReceiptCode}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyReceiptToClipboard(voteReceiptCode)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-white/5"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  Copy Code
                </button>
                <button
                  onClick={() => {
                    setVerifyReceiptInput(voteReceiptCode);
                    setShowVerifyModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verify My Vote
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowVerifyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              <ShieldCheck className="w-4 h-4" />
              Enter Receipt Code to Verify
            </button>
          )}
        </div>

        {showVerifyModal && (
          <Modal
            isOpen={showVerifyModal}
            onClose={() => {
              setShowVerifyModal(false);
              setShowVerificationSteps(false);
              setVerificationSteps([]);
              setVerificationSummary(null);
              setLastVerificationResult(null);
            }}
            title="Verify My Vote"
          >
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Enter your receipt code to generate a transparent verification report showing how your vote was counted and why it cannot be tampered with.
              </p>
              <input
                type="text"
                value={verifyReceiptInput}
                onChange={(e) => setVerifyReceiptInput(e.target.value.toUpperCase())}
                placeholder="VOTE-ABCD-1234"
                className="w-full bg-white dark:bg-[#09090B] border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-zinc-100 text-base font-mono rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Tip: Receipt code format is <span className="font-mono">VOTE-XXXX-XXXX</span>.
              </div>

              {/* Verification Report */}
              {verificationSummary && lastVerificationResult && (
                <div className={`mt-4 rounded-2xl border p-4 sm:p-5 space-y-4 ${
                  verificationSummary.all_checks_passed
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-500/10 dark:via-teal-500/5 dark:to-zinc-900 border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-gradient-to-br from-amber-50 via-zinc-50 to-white dark:from-amber-500/10 dark:via-zinc-900 dark:to-zinc-900 border-amber-300 dark:border-amber-500/30'
                }`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs uppercase tracking-widest font-black ${
                        verificationSummary.all_checks_passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        Verification Report
                      </p>
                      <p className={`text-lg font-black ${
                        verificationSummary.all_checks_passed ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'
                      }`}>
                        {verificationSummary.all_checks_passed ? 'Vote Count Confirmed' : 'Verification Completed With Warnings'}
                      </p>
                      <p className={`text-xs mt-1 ${
                        verificationSummary.all_checks_passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        {passedVerificationChecks}/{totalVerificationChecks} checks passed
                      </p>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-white/80 dark:bg-black/20 border border-white/50 dark:border-white/10">
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-black">Receipt</p>
                      <p className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-200">{lastVerificationResult.receipt_code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-white/5 rounded-lg px-3 py-2 border border-white/60 dark:border-white/10">
                      <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{verificationSummary.vote_counted ? 'Counted in Result' : 'Counting Warning'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-white/5 rounded-lg px-3 py-2 border border-white/60 dark:border-white/10">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{verificationSummary.tamper_proof ? 'Tamper-Proof' : 'Integrity Warning'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-white/5 rounded-lg px-3 py-2 border border-white/60 dark:border-white/10">
                      <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{verificationSummary.anonymous ? 'Anonymous Identity' : 'Privacy Warning'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-white/5 rounded-lg px-3 py-2 border border-white/60 dark:border-white/10">
                      <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-200">{shortVoteHash || 'Hash unavailable'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/20 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500 dark:text-zinc-400">Election</p>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        {lastVerificationResult.election.branch} - Section {lastVerificationResult.election.section}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/20 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500 dark:text-zinc-400">Recorded At</p>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        {formatDateTime(lastVerificationResult.cast_at)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500 dark:text-zinc-400 mb-2">How Your Vote Was Counted</p>
                      <div className="space-y-2">
                        {countedFlowSteps.length === 0 && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Counting proof details are not available for this receipt yet.</p>
                        )}
                        {countedFlowSteps.map((step) => (
                          <div key={`counted-${step.step}`} className="flex items-start gap-2">
                            <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${step.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            <div>
                              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{step.title}</p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.user_friendly || step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-widest font-black text-zinc-500 dark:text-zinc-400 mb-2">Why Tampering Fails</p>
                      <div className="space-y-2">
                        {tamperFlowSteps.length === 0 && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Tamper-proof checks are not available for this receipt yet.</p>
                        )}
                        {tamperFlowSteps.map((step) => (
                          <div key={`tamper-${step.step}`} className="flex items-start gap-2">
                            <Link2 className={`w-3.5 h-3.5 mt-0.5 ${step.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                            <div>
                              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{step.title}</p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.user_friendly || step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Verification Timeline */}
              {showVerificationSteps && verificationSteps.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10"></div>
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Detailed Verification Timeline</p>
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10"></div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2 verification-steps-scroll">
                    {verificationSteps.map((step) => (
                      <div
                        key={step.step}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          step.status === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                            : step.status === 'error'
                            ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-white/10'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {step.status === 'success' && (
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {step.status === 'error' && (
                            <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                          {step.status === 'pending' && (
                            <div className="w-7 h-7 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                              <span className="text-xs text-zinc-600 dark:text-zinc-300 font-bold">{step.step}</span>
                            </div>
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-sm font-bold ${
                              step.status === 'success'
                                ? 'text-emerald-800 dark:text-emerald-300'
                                : step.status === 'error'
                                ? 'text-red-800 dark:text-red-300'
                                : 'text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {step.title}
                            </p>
                          </div>
                          
                          {/* User-friendly message (primary) */}
                          {step.user_friendly && (
                            <p className={`text-xs ${
                              step.status === 'success'
                                ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                                : step.status === 'error'
                                ? 'text-red-700 dark:text-red-300 font-medium'
                                : 'text-zinc-600 dark:text-zinc-400'
                            }`}>
                              {step.user_friendly}
                            </p>
                          )}
                          
                          {/* Technical details (secondary, collapsible) */}
                          {step.details && (
                            <details className="mt-1 group">
                              <summary className="text-xs text-zinc-400 dark:text-zinc-500 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 list-none">
                                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Technical details
                              </summary>
                              <p className={`text-xs mt-1 font-mono text-[10px] leading-relaxed ${
                                step.status === 'success'
                                  ? 'text-emerald-500/70 dark:text-emerald-400/60'
                                  : step.status === 'error'
                                  ? 'text-red-500/70 dark:text-red-400/60'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}>
                                {step.details}
                              </p>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVerifyModal(false);
                    setShowVerificationSteps(false);
                    setVerificationSteps([]);
                    setVerificationSummary(null);
                    setLastVerificationResult(null);
                  }}
                  className="flex-1 bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 rounded-lg font-semibold hover:bg-zinc-200 dark:hover:bg-white/20"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => verifyVoteByReceipt()}
                  disabled={verifyingReceipt}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-500/25"
                >
                  {verifyingReceipt ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Verify Now
                    </span>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showAlert && (
          <AlertModal
            isOpen={true}
            type={showAlert.type}
            title={showAlert.title}
            message={showAlert.message}
            onConfirm={showAlert.onConfirm}
            onClose={() => setShowAlert(null)}
            confirmText={showAlert.confirmText || (showAlert.onConfirm ? 'Confirm' : 'OK')}
            cancelText={showAlert.cancelText || (showAlert.onConfirm ? 'Cancel' : undefined)}
            isLoading={loading && !!showAlert.onConfirm}
          />
        )}
      </div>
    );
  }

  const isRegistrationOpen = globalRegistrationStatus?.is_open || windowStatus?.is_open;
  const isCandidateRegistrationLocked = candidateRegistrationStatus.is_registered;
  const candidateRegistrationButtonLabel = candidateRegistrationStatus.status === 'approved'
    ? 'Approved'
    : candidateRegistrationStatus.status === 'rejected'
    ? 'Rejected'
    : candidateRegistrationStatus.status === 'pending_approval'
    ? 'Under Review'
    : 'Register as Candidate';
  const candidateStatusTone = candidateRegistrationStatus.status === 'approved'
    ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
    : candidateRegistrationStatus.status === 'rejected'
    ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
    : 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400';

  return (
    <div className="space-y-6">
      {/* Student Profile Header */}
      <div className="bg-white dark:bg-[#121214] p-6 rounded-xl shadow-md border border-zinc-200 dark:border-white/10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{student.name}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">{student.usn}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{student.branch} - Section {student.section}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Change Password">
              <button
                onClick={() => setShowChangePassword(true)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <KeyRound className="w-5 h-5" />
                <span className="text-sm font-semibold">Change Password</span>
              </button>
            </Tooltip>
            <Tooltip content="Logout">
              <button
                onClick={onLogout}
                className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Registration Status Banner */}
        {isRegistrationOpen && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Timer className="w-4 h-4" />
                <p className="text-sm font-medium">
                  {globalRegistrationStatus?.is_open ? (
                    <span>Global registration open: {formatTimeRemaining(globalTimeRemaining)} remaining</span>
                  ) : (
                    <span>Section registration open: {formatTimeRemaining(windowTimeRemaining)} remaining</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isCandidateRegistrationLocked) {
                    setShowRegisterForm(true);
                  }
                }}
                disabled={isCandidateRegistrationLocked}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shrink-0 ${
                  isCandidateRegistrationLocked
                    ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                {candidateRegistrationButtonLabel}
              </button>
            </div>
          </div>
        )}

        {candidateRegistrationStatus.status === 'rejected' && (
          <div className={`mt-4 p-4 rounded-lg border ${candidateStatusTone}`}>
            <p className="text-xs uppercase tracking-widest font-bold mb-1">Candidacy Status</p>
            <p className="text-sm font-semibold">{candidateRegistrationButtonLabel}</p>
            <p className="text-xs mt-1">{candidateRegistrationStatus.message}</p>
            {candidateRegistrationStatus.rejection_reason && (
              <p className="text-xs mt-2 bg-white/70 dark:bg-black/20 border border-current/20 rounded-md px-2 py-1">
                Clarification: {candidateRegistrationStatus.rejection_reason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Election / Voting Section */}
      {!election ? (
        <div className="bg-white dark:bg-[#121214] p-10 rounded-xl shadow-md text-center border border-amber-200 dark:border-amber-500/20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full mb-4">
            <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">No Active Election</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            There is no active election for {student.branch} Section {student.section} right now.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Please check back later or contact your class representative.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#121214] rounded-xl shadow-md overflow-hidden border border-zinc-200 dark:border-white/10">
          {/* Election Header with Timer */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Vote className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Class Representative Election</h2>
                </div>
                <p className="text-blue-100 font-medium">
                  {student.branch} - Section {student.section}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${timeRemaining < 300 ? 'bg-red-500/30' : 'bg-white/20'} backdrop-blur-sm`}>
                <Timer className={`w-5 h-5 ${timeRemaining < 300 ? 'animate-pulse' : ''}`} />
                <div>
                  <p className="text-xs font-medium text-blue-100 uppercase">
                    {timeRemaining < 300 ? 'Ending Soon' : 'Time Remaining'}
                  </p>
                  <p className="text-lg font-bold">{formatTimeRemaining(timeRemaining)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Candidates
              </h3>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/10 px-3 py-1 rounded-full">
                {candidates.length} {candidates.length === 1 ? 'Candidate' : 'Candidates'}
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500 dark:text-zinc-400">No candidates registered</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Registration may still be open - check above!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {candidates.map((candidate, index) => (
                  <div
                    key={candidate.id}
                    className={`p-6 border-2 rounded-lg transition-all bg-white dark:bg-[#09090B] ${
                      selectedCandidateId === candidate.id
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-zinc-100 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full font-bold text-sm">
                            {index + 1}
                          </span>
                          <h4 className="text-xl font-semibold text-zinc-900 dark:text-white">{candidate.name}</h4>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm italic pl-11">"{candidate.manifesto}"</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedCandidateId === candidate.id ? (
                          <>
                            <button
                              onClick={() => setSelectedCandidateId(null)}
                              disabled={loading}
                              className="bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-300 dark:hover:bg-white/20 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmVote}
                              disabled={loading}
                              className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                            >
                              {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5" />
                                  Confirm Vote
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleVoteClick(candidate.id)}
                            disabled={loading}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                          >
                            <Vote className="w-5 h-5" />
                            SELECT
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* NOTA Option */}
                <div
                  className={`p-6 border-2 rounded-lg transition-all bg-white dark:bg-[#09090B] ${
                    selectedCandidateId === null && candidates.length > 0
                      ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-500/10'
                      : 'border-zinc-100 dark:border-white/10 hover:border-amber-500 dark:hover:border-amber-400'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <ThumbsDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white">NOTA</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">None of the Above - I don't want to vote for any candidate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedCandidateId === null && candidates.length > 0 ? (
                        <>
                          <button
                            onClick={() => setSelectedCandidateId(undefined)}
                            disabled={loading}
                            className="bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-300 dark:hover:bg-white/20 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmVote}
                            disabled={loading}
                            className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <ThumbsDown className="w-5 h-5" />
                                Confirm NOTA
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleVoteClick(null)}
                          disabled={loading}
                          className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                          <ThumbsDown className="w-5 h-5" />
                          Select NOTA
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voting Instructions */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Voting Rules:
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                <li>- You can only vote <strong>once</strong>. This action cannot be undone.</li>
                <li>- Your vote is <strong>anonymous</strong>. No one can map your identity to your vote.</li>
                <li>- Select a candidate (or NOTA), then press <strong>Confirm Vote</strong>.</li>
                <li>- The election ends in <strong>{formatTimeRemaining(timeRemaining)}</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#121214] rounded-xl shadow-xl max-w-lg w-full p-6 border border-zinc-200 dark:border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Register as Candidate
              </h3>
              <button
                onClick={() => setShowRegisterForm(false)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-lg border border-blue-200 dark:border-blue-500/20">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Section:</strong> {student.branch} - {student.section}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 flex items-center gap-1">
                <Timer className="w-4 h-4" />
                {globalRegistrationStatus?.is_open ? (
                  <span>Global registration - Time remaining: {formatTimeRemaining(globalTimeRemaining)}</span>
                ) : (
                  <span>Section registration - Time remaining: {formatTimeRemaining(windowTimeRemaining)}</span>
                )}
              </p>
            </div>
            <form onSubmit={handleRegisterCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Manifesto
                </label>
                <textarea
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  placeholder="Write your vision (minimum 10 characters)..."
                  rows={5}
                  required
                  minLength={10}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-zinc-400 dark:placeholder-zinc-500"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {manifesto.length}/10 minimum characters
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="flex-1 bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-200 dark:hover:bg-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || manifesto.length < 10}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          userEmail={student.email}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {/* Alert Modal */}
      {showAlert && (
        <AlertModal
          isOpen={true}
          type={showAlert.type}
          title={showAlert.title}
          message={showAlert.message}
          onConfirm={showAlert.onConfirm}
          onClose={() => setShowAlert(null)}
          confirmText={showAlert.confirmText || (showAlert.onConfirm ? 'Confirm' : 'OK')}
          cancelText={showAlert.cancelText || (showAlert.onConfirm ? 'Cancel' : undefined)}
          isLoading={loading && !!showAlert.onConfirm}
        />
      )}
    </div>
  );
};

export default StudentProfile;
