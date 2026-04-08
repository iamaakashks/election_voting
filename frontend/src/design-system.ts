/**
 * NIE Elections Design System
 * Consistent styling across all components
 */

// ============ Color Palette ============
export const colors = {
  // Background
  bg: {
    primary: '#F8FAFC',
    secondary: '#FFFFFF',
    dark: '#09090B',
    card: '#121214',
  },
  // Border
  border: {
    light: 'border-zinc-200',
    dark: 'border-white/10',
  },
  // Brand Colors
  brand: {
    blue: 'blue',
    emerald: 'emerald',
    purple: 'purple',
    amber: 'amber',
    red: 'red',
  },
};

// ============ Spacing ============
export const spacing = {
  card: {
    padding: 'p-5',
    paddingLg: 'p-6',
    paddingXl: 'p-8',
  },
  gap: {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
  },
};

// ============ Typography ============
export const typography = {
  heading: {
    h1: 'text-2xl font-black tracking-tight',
    h2: 'text-lg font-black',
    h3: 'text-base font-bold',
  },
  label: 'text-[10px] font-bold uppercase tracking-widest',
  body: 'text-sm font-medium',
  small: 'text-xs',
};

// ============ Border Radius ============
export const radius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
};

// ============ Shadows ============
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

// ============ Common Classes ============
export const commonClasses = {
  // Card
  card: 'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-2xl',
  cardHover: 'hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-lg transition-all',
  
  // Button Primary
  buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors',
  buttonPrimarySm: 'text-xs py-2 px-3',
  buttonPrimaryMd: 'text-sm py-2.5 px-4',
  buttonPrimaryLg: 'text-base py-3 px-6',
  
  // Button Secondary
  buttonSecondary: 'bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition-colors',
  
  // Button Danger
  buttonDanger: 'bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors',
  
  // Button Warning
  buttonWarning: 'bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors',
  
  // Input
  input: 'w-full px-4 py-3 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
  
  // Badge
  badgeActive: 'bg-emerald-500 text-white',
  badgeUpcoming: 'bg-blue-500 text-white',
  badgeCompleted: 'bg-zinc-500 text-white',
  badgePending: 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400',
  badgeRegistration: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  badgeReopened: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  
  // Status Colors
  statusEmerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  statusBlue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400',
  statusPurple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400',
  statusAmber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
  statusRed: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400',
  
  // Icon Container
  iconContainer: 'p-2.5 rounded-xl',
  iconContainerSm: 'p-2 rounded-lg',
  
  // Modal
  modal: 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm',
  modalContent: 'bg-white dark:bg-[#121214] rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col',
  
  // Table
  tableHeader: 'bg-zinc-50 dark:bg-white/5 sticky top-0',
  tableCell: 'py-3 px-4 text-sm',
  tableHeaderCell: 'py-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400',
  
  // Progress Bar
  progressBar: 'h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden',
  
  // Tooltip
  tooltip: 'absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-10',
};

// ============ Utility Functions ============
export const getTurnoutColor = (percentage: number): string => {
  if (percentage >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (percentage >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export const getTurnoutBgColor = (percentage: number): string => {
  if (percentage >= 70) return 'bg-emerald-500';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-red-500';
};

export const getStatusClasses = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: commonClasses.badgeActive,
    upcoming: commonClasses.badgeUpcoming,
    completed: commonClasses.badgeCompleted,
    pending: commonClasses.badgePending,
    registration_open: commonClasses.badgeRegistration,
    reopened: commonClasses.badgeReopened,
  };
  return statusMap[status] || commonClasses.badgePending;
};

// ============ Icon Sizes ============
export const iconSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  xxl: 'w-8 h-8',
};

// ============ Animation Classes ============
export const animations = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
};

// ============ Responsive Grid ============
export const grids = {
  stats: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  cards: 'grid grid-cols-1 lg:grid-cols-2 gap-4',
  dashboard: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
  electionCards: 'grid grid-cols-1 md:grid-cols-2 gap-4',
};
