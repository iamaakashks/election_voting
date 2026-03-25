import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import Login from './components/Login';
import StudentProfile from './components/StudentProfile';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { ShieldCheck, Moon, Sun, Monitor, Menu, X, ChevronRight, LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen, DoorOpen, Users, CalendarDays, Shield as ShieldIcon, GraduationCap, BookOpen, FileClock } from 'lucide-react';
import Tooltip from './components/Tooltip';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Check if user has valid session
const checkSession = async (): Promise<any | null> => {
  const token = localStorage.getItem('auth_token');
  const userType = localStorage.getItem('user_type');
  
  if (!token || !userType) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me?token=${token}`);
    if (response.ok) {
      const data = await response.json();
      return {
        user: data,
        userType: userType as 'student' | 'admin'
      };
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
  
  // Invalid session, clear storage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_type');
  return null;
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center p-1 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10 backdrop-blur-sm">
      <Tooltip content="Light Theme">
        <button
          onClick={() => setTheme('light')}
          className={`p-1.5 rounded-full transition-all duration-300 ${theme === 'light' ? 'bg-white shadow-sm text-zinc-900 dark:bg-white/10 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Sun className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip content="System Theme">
        <button
          onClick={() => setTheme('system')}
          className={`p-1.5 rounded-full transition-all duration-300 ${theme === 'system' ? 'bg-white shadow-sm text-zinc-900 dark:bg-white/10 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Monitor className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip content="Dark Theme">
        <button
          onClick={() => setTheme('dark')}
          className={`p-1.5 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-white shadow-sm text-zinc-900 dark:bg-white/10 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Moon className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
};

const NavigationLinks = ({ userType, onLogout, onClick, collapsed = false, onNavigateToTab }: { userType: 'student' | 'admin' | null, onLogout?: () => void, onClick?: () => void, collapsed?: boolean, onNavigateToTab?: (tab: string) => void }) => {
  const linkClass = (active: boolean) => `group flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
    active
      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
  } ${collapsed ? 'lg:justify-center lg:px-3' : ''}`;

  const handleAdminNav = (tab: string) => {
    if (onNavigateToTab) {
      onNavigateToTab(tab);
      onClick?.();
    }
  };

  return (
    <nav className="space-y-2 mt-6 px-4">
      <h3 className={`px-4 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 ${collapsed ? 'lg:hidden' : ''}`}>Navigation</h3>
      {userType === 'student' && (
        <button onClick={onClick} className={linkClass(true)}>
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className={collapsed ? 'lg:hidden' : ''}>Voter Portal</span>
        </button>
      )}
      {userType === 'admin' && onNavigateToTab && (
        <>
          <button onClick={() => handleAdminNav('global')} className={linkClass(false)}>
            <DoorOpen className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Registration</span>
          </button>
          <button onClick={() => handleAdminNav('all-candidates')} className={linkClass(false)}>
            <Users className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>All Candidates</span>
          </button>
          <button onClick={() => handleAdminNav('election')} className={linkClass(false)}>
            <CalendarDays className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Elections</span>
          </button>
          <button onClick={() => handleAdminNav('candidates')} className={linkClass(false)}>
            <ShieldIcon className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Approvals</span>
          </button>
          <button onClick={() => handleAdminNav('students')} className={linkClass(false)}>
            <GraduationCap className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Students</span>
          </button>
          <button onClick={() => handleAdminNav('live-ledger')} className={linkClass(false)}>
            <BookOpen className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Live Ledger</span>
          </button>
          <button onClick={() => handleAdminNav('audit-log')} className={linkClass(false)}>
            <FileClock className="w-4 h-4" />
            <span className={collapsed ? 'lg:hidden' : ''}>Audit Log</span>
          </button>
        </>
      )}
      {userType === 'admin' && !onNavigateToTab && (
        <button onClick={onClick} className={linkClass(true)}>
          <LayoutGrid className="w-4 h-4 text-blue-600" />
          <span className={collapsed ? 'lg:hidden' : ''}>Admin Panel</span>
        </button>
      )}
      {userType && onLogout && (
        <button onClick={onLogout} className={`${linkClass(false)} text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}>
          <LogOut className="w-4 h-4" />
          <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
        </button>
      )}
    </nav>
  );
};

const Layout = ({ children, userType, onLogout }: { children: React.ReactNode, userType: 'student' | 'admin' | null, onLogout?: () => void }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  if (!userType) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#09090B] overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300 selection:bg-blue-500/30">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/40 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 ${desktopSidebarOpen ? 'lg:w-72' : 'lg:w-20'} bg-white dark:bg-[#121214] border-r border-zinc-200 dark:border-white/10 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-2xl lg:shadow-none flex flex-col`}>
        <div className={`h-20 flex items-center border-b border-zinc-200 dark:border-white/10 shrink-0 ${desktopSidebarOpen ? 'px-8' : 'lg:px-4 px-8'}`}>
          <div className="flex items-center gap-3 w-full">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className={`flex flex-col ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>
              <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-none mb-1">NIE Elections</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded w-fit">{userType === 'admin' ? 'Admin' : 'Voter'}</span>
            </div>
            <button
              className="lg:hidden ml-auto p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <NavigationLinks userType={userType} onLogout={onLogout} onClick={() => setMobileMenuOpen(false)} collapsed={!desktopSidebarOpen} />
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-zinc-200 dark:border-white/10 shrink-0">
          <div className={`flex items-center rounded-xl bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/5 transition-colors ${desktopSidebarOpen ? 'gap-3 px-4 py-3' : 'lg:justify-center lg:px-2 lg:py-3 gap-3 px-4 py-3'}`}>
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-500/30">
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                {userType === 'admin' ? 'AD' : 'ST'}
              </span>
            </div>
            <div className={`flex flex-col overflow-hidden ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>
              <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{userType === 'admin' ? 'Admin User' : 'Student'}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">{userType === 'admin' ? 'Administrator' : 'Voter'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 bg-[#F8FAFC]/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-white/5 shrink-0 flex items-center justify-between px-6 sm:px-8 lg:px-12 z-30 transition-colors duration-300 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              className="hidden lg:inline-flex p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              onClick={() => setDesktopSidebarOpen(prev => !prev)}
              aria-label={desktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {desktopSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <button
              className="lg:hidden p-2 -ml-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Context */}
            <div className="hidden sm:flex items-center text-[13px] font-bold text-zinc-500 dark:text-zinc-400">
              <LayoutGrid className="w-4 h-4 mr-2" />
              <span>NIE CR Elections</span>
              <ChevronRight className="w-4 h-4 mx-1.5 opacity-50" />
              <span className="text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-white/10 px-2.5 py-1 rounded-md">{userType === 'admin' ? 'Admin Panel' : 'Voter Portal'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 sm:p-8 lg:p-12 relative">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-500/5 dark:from-blue-500/10 to-transparent pointer-events-none -z-10" />
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  const [userType, setUserType] = useState<'student' | 'admin' | null>(null);
  const [studentUser, setStudentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initSession = async () => {
      const session = await checkSession();
      if (session) {
        if (session.userType === 'student') {
          setStudentUser(session.user);
        }
        setUserType(session.userType);
      }
      setIsLoading(false);
    };
    
    initSession();
  }, []);

  const handleStudentLogin = (user: any) => {
    setStudentUser(user);
    setUserType('student');
  };

  const handleAdminLogin = (user: any) => {
    setUserType('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_type');
    setUserType(null);
    setStudentUser(null);
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400 font-semibold">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!userType) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <Login onStudentLogin={handleStudentLogin} onAdminLogin={handleAdminLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <Router>
        <Layout userType={userType} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={userType === 'student' && studentUser ? <StudentProfile student={studentUser} onLogout={handleLogout} /> : <Navigate to="/admin" replace />} />
            <Route path="/admin" element={userType === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
