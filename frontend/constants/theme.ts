export const Colors = {
  // Brand
  primary: '#1B4D3E',
  primaryLight: '#2D7A62',
  primaryMuted: '#E8F5F0',
  accent: '#C9A84C',
  accentLight: '#F5EDCC',

  // Backgrounds
  background: '#F5F4F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EFE9',
  surfaceElevated: '#FFFFFF',

  // Borders
  border: '#E5E5EA',
  divider: '#F2F2F7',

  // Text
  textPrimary: '#1C1C1E',
  textSecondary: '#6C6C70',
  textTertiary: '#AEAEB2',
  textInverse: '#FFFFFF',
  textAccent: '#C9A84C',

  // Semantic
  success: '#34C759',
  successBg: '#F0FFF4',
  successText: '#1A7F3C',
  error: '#FF3B30',
  errorBg: '#FFF5F5',
  errorText: '#C0392B',
  warning: '#FF9F0A',
  warningBg: '#FFFBF0',
  info: '#007AFF',
  infoBg: '#F0F7FF',
} as const;

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Asset type display config
export const AssetConfig: Record<string, { label: string; icon: string; color: string }> = {
  cash: { label: 'Cash & Savings', icon: 'cash', color: '#34C759' },
  gold: { label: 'Gold', icon: 'diamond', color: '#C9A84C' },
  silver: { label: 'Silver', icon: 'diamond-outline', color: '#8E8E93' },
  stocks: { label: 'Stocks & Shares', icon: 'trending-up', color: '#007AFF' },
  business_inventory: { label: 'Business Assets', icon: 'briefcase', color: '#FF9F0A' },
  receivables: { label: 'Money Owed', icon: 'arrow-down-circle', color: '#5856D6' },
  property: { label: 'Property', icon: 'home', color: '#FF6B6B' },
  debts: { label: 'Debts', icon: 'remove-circle', color: '#FF3B30' },
};

export const SadaqahTypeConfig: Record<string, { label: string; color: string }> = {
  sadaqah: { label: 'Sadaqah', color: '#34C759' },
  lillah: { label: 'Lillah', color: '#007AFF' },
  fidya: { label: 'Fidya', color: '#FF9F0A' },
  kaffarah: { label: 'Kaffarah', color: '#5856D6' },
  aqiqah: { label: 'Aqiqah', color: '#FF6B6B' },
  zakat_ul_fitr: { label: 'Zakat ul-Fitr', color: '#C9A84C' },
};
