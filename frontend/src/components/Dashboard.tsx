import React, { useState } from 'react';
import StudentProfile from './StudentProfile';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Student {
  usn: string;
  name: string;
  email: string;
  branch: string;
  section: string;
  is_admin: boolean;
  has_voted: boolean;
}

const Dashboard: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/student/login`, {
        email,
        password
      });

      if (response.data.success && response.data.user) {
        setSelectedStudent(response.data.user);
        // Optionally store token in localStorage
        localStorage.setItem('token', response.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  if (selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        onLogout={() => {
          setSelectedStudent(null);
          localStorage.removeItem('token');
        }}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#121214] p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-blue-100 dark:bg-blue-500/20 p-4 rounded-full mb-4 shadow-inner">
            <LogIn className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">Student Portal</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-[250px]">
            Enter your credentials to access the election portal.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                placeholder="e.g., 4ni22csa001_c@nie.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-100 dark:border-white/5 pt-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you an administrator?{' '}
            <a href="/admin" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline decoration-2 underline-offset-4">
              Go to Admin Panel
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
