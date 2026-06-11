export const THEME = {
  colors: {
    background: '#FFFFFF', // pure white viewport
    surface: '#FFFFFF',    // primary surface
    surfaceCard: '#FFFFFF',// white card
    surfaceSecondary: '#FAFBFC', // secondary surface
    border: '#EEF2F7',     // card border
    borderLight: '#EAEFF5',// secondary border
    textPrimary: '#0F172A',// slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#64748B',     // slate-500
    primary: '#7C3AED',    // brand-start
    primaryLight: '#8B5CF6',// brand-mid
    accent: '#06B6D4',     // brand-end
    success: '#10b981',    // emerald-500
    warning: '#f59e0b',    // amber-500
    danger: '#ef4444',     // red-500
    
    // Gradients
    primaryGradient: ['#7C3AED', '#8B5CF6'],
    accentGradient: ['#8B5CF6', '#06B6D4'],
    dangerGradient: ['#ef4444', '#fca5a5'],
    glassGradient: ['rgba(255, 255, 255, 0.95)', 'rgba(250, 251, 252, 0.9)'],
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
