export const theme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    clinical: {
      critical: '#dc2626',
      high: '#f97316',
      moderate: '#eab308',
      normal: '#22c55e',
      info: '#3b82f6',
    },
  },
  acuityColors: {
    1: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-500' },
    2: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
    3: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' },
    4: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-500' },
    5: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
  },
  priorityColors: {
    critical: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-500' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', badge: 'bg-yellow-500' },
    low: { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-500' },
  },
} as const

export type AcuityLevel = 1 | 2 | 3 | 4 | 5
export type Priority = 'critical' | 'high' | 'medium' | 'low'
