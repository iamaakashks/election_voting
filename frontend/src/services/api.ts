import axios, { AxiosInstance } from 'axios';

const normalizeApiBaseUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.replace(/\/$/, '');
  }
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Candidate {
  id: number;
  name: string;
  usn: string;
  manifesto: string;
}

export interface Election {
  id: number;
  branch: string;
  section: string;
  start_time: string;
  end_time: string;
  time_remaining: number;
}

export interface CandidateRegistrationResponse {
  message: string;
  candidate_id: number;
  status: 'pending_approval' | 'already_registered' | 'already_approved' | 'already_rejected';
  note: string;
}

export interface CandidateRegistrationStatusResponse {
  is_registered: boolean;
  status: 'not_registered' | 'pending_approval' | 'approved' | 'rejected';
  candidate_id: number | null;
  message: string;
  rejection_reason?: string | null;
}

export interface VoteCastResponse {
  message: string;
  timestamp: string;
  vote_id: number;
  receipt_code: string;
  chain_verified: boolean;
  is_nota: boolean;
  merkle_root: string;
}

export interface VoteReceiptVerificationStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'success' | 'error';
  details?: string;
  user_friendly?: string;
}

export interface VoteReceiptVerificationSummary {
  all_checks_passed: boolean;
  vote_confirmed: boolean;
  vote_counted: boolean;
  tamper_proof: boolean;
  anonymous: boolean;
  message: string;
}

export interface VoteReceiptVerificationResponse {
  valid: boolean;
  receipt_code: string;
  vote_hash: string;
  election: {
    id: number;
    branch: string;
    section: string;
  };
  cast_at: string;
  verified: boolean;
  message: string;
  verification_steps?: VoteReceiptVerificationStep[];
  summary?: VoteReceiptVerificationSummary;
}

export const electionsAPI = {
  getActiveElection: async (branch: string, section: string): Promise<{ election: Election | null; candidates: Candidate[] }> => {
    const response = await api.get('/elections/active', {
      params: { branch, section },
    });
    return response.data;
  },

  castVote: async (election_id: number, candidate_id: number | undefined, student_usn: string, is_nota: boolean = false): Promise<VoteCastResponse> => {
    const response = await api.post('/vote', {
      election_id,
      candidate_id,
      is_nota,
      student_usn  // Send in body
    });
    return response.data;
  },

  verifyVoteReceipt: async (receipt_code: string): Promise<VoteReceiptVerificationResponse> => {
    const response = await api.post('/public/verify-receipt', {
      receipt_code: receipt_code.trim().toUpperCase(),
    });
    return response.data;
  },
};

export const adminAPI = {
  createElection: async (branch: string, section: string, duration_minutes: number) => {
    const response = await api.post('/admin/elections/create', {
      branch,
      section,
      duration_minutes,
    });
    return response.data;
  },

  listElections: async () => {
    const response = await api.get('/admin/elections');
    return response.data;
  },

  getResults: async (election_id: number) => {
    const response = await api.get(`/admin/results/${election_id}`);
    return response.data;
  },

  listStudents: async (branch?: string, section?: string, search?: string, skip: number = 0, limit: number = 25) => {
    const params: Record<string, string | number> = { skip, limit };
    if (branch) params.branch = branch;
    if (section) params.section = section;
    if (search) params.search = search;
    const response = await api.get('/admin/students', { params });
    return response.data;
  },

  approveCandidate: async (candidate_id: number, approved: boolean = true, rejection_reason?: string) => {
    const params: Record<string, string | boolean> = { approved };
    if (rejection_reason && rejection_reason.trim()) {
      params.rejection_reason = rejection_reason.trim();
    }
    const response = await api.post(`/admin/candidates/approve/${candidate_id}`, null, {
      params,
    });
    return response.data;
  },

  getPendingCandidates: async () => {
    const response = await api.get('/admin/candidates/pending');
    return response.data;
  },

  openCandidatureWindow: async (branch: string, section: string, duration_minutes: number) => {
    const response = await api.post('/admin/candidature-window/open', {
      branch,
      section,
      duration_minutes,
    });
    return response.data;
  },

  getCandidatureWindowStatus: async (branch: string, section: string) => {
    const response = await api.get('/admin/candidature-window/status', {
      params: { branch, section },
    });
    return response.data;
  },

  closeCandidatureWindow: async (branch: string, section: string) => {
    const response = await api.post('/admin/candidature-window/close', null, {
      params: { branch, section },
    });
    return response.data;
  },

  getWindowCandidates: async (branch: string, section: string) => {
    const response = await api.get('/admin/candidature-window/candidates', {
      params: { branch, section },
    });
    return response.data;
  },

  // Global Registration Endpoints
  openGlobalRegistration: async (duration_minutes: number) => {
    const response = await api.post('/admin/registration/global/open', {
      duration_minutes,
    });
    return response.data;
  },

  closeGlobalRegistration: async () => {
    const response = await api.post('/admin/registration/global/close');
    return response.data;
  },

  getGlobalRegistrationStatus: async () => {
    const response = await api.get('/admin/registration/global/status');
    return response.data;
  },

  // Section Override Endpoints
  createSectionOverride: async (branch: string, section: string, duration_minutes: number, reason?: string) => {
    const response = await api.post('/admin/registration/section/override', {
      branch,
      section,
      duration_minutes,
      reason,
    });
    return response.data;
  },

  closeSectionOverride: async (branch: string, section: string) => {
    const response = await api.post('/admin/registration/section/override/close', null, {
      params: { branch, section },
    });
    return response.data;
  },

  listSectionOverrides: async () => {
    const response = await api.get('/admin/registration/section/overrides');
    return response.data;
  },

  getSectionOverrideStatus: async (branch: string, section: string) => {
    const response = await api.get('/admin/registration/section/override/status', {
      params: { branch, section },
    });
    return response.data;
  },

  // Section-wise Candidates
  getSectionWiseCandidates: async (branch?: string) => {
    const params: Record<string, string> = {};
    if (branch) params.branch = branch;
    const response = await api.get('/admin/candidates/section-wise', { params });
    return response.data;
  },

  // Election Results & PDF
  getElectionResults: async (election_id: number) => {
    const response = await api.get(`/admin/results/${election_id}`);
    return response.data;
  },

  generateResultPDF: async (election_id: number, admin_name?: string) => {
    const params: Record<string, string> = {};
    if (admin_name) params.admin_name = admin_name;
    const response = await api.post(`/admin/results/${election_id}/generate-pdf`, null, { params });
    return response.data;
  },

  downloadResultPDF: async (election_id: number) => {
    const response = await api.get(`/admin/results/${election_id}/download-pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  verifyElectionIntegrity: async (election_id: number) => {
    const response = await api.get(`/admin/results/${election_id}/verification`);
    return response.data;
  },

  getElectionAnalytics: async (election_id: number) => {
    const response = await api.get(`/admin/analytics/${election_id}`);
    return response.data;
  },

  forceStopElection: async (election_id: number) => {
    const response = await api.post(`/admin/elections/${election_id}/force-stop`);
    return response.data;
  },

  resetAllData: async () => {
    const response = await api.post('/admin/system/reset-all');
    return response.data;
  },

  // Auth endpoints
  studentLogin: async (email: string, password: string) => {
    const response = await api.post('/auth/student/login', { email, password });
    return response.data;
  },

  adminLogin: async (email: string, password: string) => {
    const response = await api.post('/auth/admin/login', { email, password });
    return response.data;
  },

  getCurrentUser: async (token: string) => {
    const response = await api.get('/auth/me', { params: { token } });
    return response.data;
  },

  changePassword: async (email: string, old_password: string, new_password: string) => {
    const response = await api.post('/auth/change-password', {
      email,
      old_password,
      new_password
    });
    return response.data;
  },
};

export const candidateAPI = {
  register: async (usn: string, manifesto: string): Promise<CandidateRegistrationResponse> => {
    const response = await api.post('/candidates/register', null, {
      params: { usn, manifesto },
    });
    return response.data;
  },

  getStatus: async (usn: string): Promise<CandidateRegistrationStatusResponse> => {
    const response = await api.get('/candidates/status', {
      params: { usn },
    });
    return response.data;
  },
};

export default api;
