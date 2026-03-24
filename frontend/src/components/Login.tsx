import React, { useState } from 'react';
import { ShieldCheck, User, Lock, LogIn, AlertCircle, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface LoginProps {
  onStudentLogin: (user: any) => void;
  onAdminLogin: (user: any) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Login: React.FC<LoginProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = loginType === 'student' ? '/auth/student/login' : '/auth/admin/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Save token and user type to localStorage for session persistence
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      localStorage.setItem('user_type', loginType);

      if (loginType === 'student') {
        onStudentLogin(data.user);
      } else {
        onAdminLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center p-1 bg-white dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10 backdrop-blur-sm">
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">NIE CR Elections</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Class Representative Voting System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-xl border border-zinc-200 dark:border-white/10 p-6">
          {/* Login Type Tabs */}
          <div className="flex mb-6 p-1 bg-zinc-100 dark:bg-white/5 rounded-xl">
            <button
              onClick={() => { setLoginType('student'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                loginType === 'student'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Student
            </button>
            <button
              onClick={() => { setLoginType('admin'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                loginType === 'admin'
                  ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Admin
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                College Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginType === 'student' ? '4ni22csa001@nie.edu.in' : 'admin@nie.edu.in'}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loginType === 'student' ? 'Last 4 of USN' : 'Admin password'}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {loginType === 'student' ? 'Student Login' : 'Admin Login'}
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/10">
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
              Login Credentials
            </p>
            {loginType === 'student' ? (
              <div className="space-y-2 text-sm">
                <p className="text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-900 dark:text-white">Email:</strong> Your college email (e.g., 4ni22csa001@nie.edu.in)
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-900 dark:text-white">Password:</strong> Last 4 characters of your USN (e.g., A001)
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-900 dark:text-white">Email:</strong> admin@nie.edu.in
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-900 dark:text-white">Password:</strong> admin123
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
