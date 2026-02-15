import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface PageHeroProps {
  title: string
  subtitle: string
  icon?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  isDark?: boolean
  className?: string
}

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
    <section
      className={clsx(
        'rounded-xl border p-4',
        isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-gradient-to-r from-sky-50 to-blue-50 border-blue-100',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div
              className={clsx(
                'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={clsx('text-lg font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>
              {title}
            </h1>
            <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-600')}>
              {subtitle}
            </p>
            {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </section>
  )
}
