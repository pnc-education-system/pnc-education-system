export interface Student {
  id: string
  name: string
  avatar?: string
  studentId: string
  batch: string
  year: string
  status: 'Active' | 'Pending' | 'Inactive' | 'Graduated'
  school: string
  logo?: string
  qrCode?: string
  emergencyContact?: string
  website?: string
  address?: string
  signature?: string
}

export type CardTemplate = 'classic' | 'modern' | 'premium'

export type CardTheme = 'blue' | 'green' | 'purple' | 'orange' | 'dark'

export type CardBackground = 'white' | 'gradient' | 'pattern' | 'abstract'

export interface CardSettings {
  template: CardTemplate
  theme: CardTheme
  background: CardBackground
  showQRCode: boolean
  showAcademicYear: boolean
  showBatch: boolean
  showStatus: boolean
  showFooter: boolean
}

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  bg: string
  text: string
}

export const themeColors: Record<CardTheme, ThemeColors> = {
  blue: {
    primary: '#1e3a8a',
    secondary: '#3b82f6',
    accent: '#60a5fa',
    bg: '#ffffff',
    text: '#1e293b'
  },
  green: {
    primary: '#166534',
    secondary: '#22c55e',
    accent: '#4ade80',
    bg: '#ffffff',
    text: '#1e293b'
  },
  purple: {
    primary: '#7c3aed',
    secondary: '#a855f7',
    accent: '#c084fc',
    bg: '#ffffff',
    text: '#1e293b'
  },
  orange: {
    primary: '#c2410c',
    secondary: '#f97316',
    accent: '#fb923c',
    bg: '#ffffff',
    text: '#1e293b'
  },
  dark: {
    primary: '#1f2937',
    secondary: '#374151',
    accent: '#6b7280',
    bg: '#111827',
    text: '#f9fafb'
  }
}
