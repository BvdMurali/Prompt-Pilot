export const THEME = {
  colors: {
    background: '#020617', // slate-950
    surface: '#0f172a',    // slate-900
    surfaceCard: '#1e293b',// slate-800
    border: '#1e293b',
    borderLight: '#334155',
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af', // slate-400
    textMuted: '#6b7280',     // slate-500
    primary: '#4f46e5',    // indigo-600
    primaryLight: '#818cf8',// indigo-400
    accent: '#a855f7',     // purple-500
    success: '#10b981',    // emerald-500
    warning: '#f59e0b',    // amber-500
    danger: '#ef4444',     // red-500
    
    // Gradients
    primaryGradient: ['#4f46e5', '#818cf8'],
    accentGradient: ['#818cf8', '#a855f7'],
    dangerGradient: ['#ef4444', '#f87171'],
    glassGradient: ['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.4)'],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  roundness: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontFamily: {
      sans: 'System',
      mono: 'Courier New',
    },
    sizes: {
      xxs: 10,
      xs: 11,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 22,
      xxxl: 28,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    } as const,
  }
};
