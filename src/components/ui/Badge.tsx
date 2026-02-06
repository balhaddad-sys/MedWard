import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'critical'
  size?: 'sm' | 'md'
  pulse?: boolean
  className?: string
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  outline: 'border border-gray-300 text-gray-700',
  critical: 'bg-red-600 text-white animate-pulse-critical',
}

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
}

export function Badge({ children, variant = 'default', size = 'md', pulse = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-semibold leading-tight',
        variantStyles[variant],
        sizeStyles[size],
        pulse && variant !== 'critical' && 'animate-pulse-critical',
        className
      )}
    >
      {children}
    </span>
  )
}
