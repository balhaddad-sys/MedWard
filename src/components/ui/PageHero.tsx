import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface PageHeroProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  isDark?: boolean
  className?: string
}

/**
 * Lightweight page header — replaces the heavy gradient hero with a
 * clean, information-dense header that works for doctors on the go.
 */
export function PageHero({
  title,
  subtitle,
  icon,
  meta,
  actions,
  isDark = false,
  className,
}: PageHeroProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-3', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className={clsx(
            'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
            isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-100 text-blue-700'
          )}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className={clsx(
            'text-xl font-bold truncate',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {title}
          </h1>
          {subtitle && (
            <p className={clsx(
              'text-xs mt-0.5 truncate',
              isDark ? 'text-slate-400' : 'text-gray-500'
            )}>
              {subtitle}
            </p>
          )}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {meta}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
