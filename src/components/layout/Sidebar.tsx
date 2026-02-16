import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ArrowRightLeft,
  FlaskConical,
  Stethoscope,
  Circle,
  Phone,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useClinicalMode } from '@/context/useClinicalMode'
import type { ClinicalMode, ModeFeatures } from '@/config/modes'
import { triggerHaptic } from '@/utils/haptics'
import { useTaskStore } from '@/stores/taskStore'
import { usePatientStore } from '@/stores/patientStore'
import { useMemo } from 'react'

const FEATURE_BADGES: { key: keyof ModeFeatures; label: string; color: string }[] = [
  { key: 'spibar', label: 'SBAR', color: 'blue' },
  { key: 'taskEngine', label: 'Tasks', color: 'blue' },
  { key: 'escalation', label: 'Escalation', color: 'red' },
  { key: 'calculators', label: 'Scores', color: 'purple' },
  { key: 'timers', label: 'Timers', color: 'amber' },
  { key: 'trendDeck', label: 'Trends', color: 'green' },
  { key: 'resultsFollowUp', label: 'Follow-Up', color: 'indigo' },
  { key: 'smartScribe', label: 'SmartScribe', color: 'stone' },
  { key: 'patientEducation', label: 'Education', color: 'teal' },
]

const BADGE_STYLES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  stone: 'bg-stone-200 text-stone-700',
  teal: 'bg-teal-100 text-teal-700',
}

const DARK_BADGE_STYLES: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-400',
  red: 'bg-red-500/15 text-red-400',
  purple: 'bg-purple-500/15 text-purple-400',
  amber: 'bg-amber-500/15 text-amber-400',
  green: 'bg-green-500/15 text-green-400',
  indigo: 'bg-indigo-500/15 text-indigo-400',
  stone: 'bg-slate-700 text-slate-300',
  teal: 'bg-teal-500/15 text-teal-400',
}

const NOTIFY_LABELS: Record<string, string> = {
  'all': 'All alerts',
  'urgent': 'Urgent only',
  'critical-only': 'Critical only',
}

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', modes: ['ward'] as ClinicalMode[] },
  { path: '/clerking', icon: Stethoscope, label: 'Clerking', modes: ['clerking'] as ClinicalMode[] },
  { path: '/on-call', icon: Phone, label: 'On-Call List', modes: ['acute', 'clerking'] as ClinicalMode[] },
  { path: '/patients', icon: Users, label: 'Patients', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[], countKey: 'patients' as const },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[], countKey: 'tasks' as const },
  { path: '/labs', icon: FlaskConical, label: 'Labs', modes: ['ward', 'acute'] as ClinicalMode[], countKey: 'criticalLabs' as const },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover', modes: ['ward', 'acute'] as ClinicalMode[] },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, config } = useClinicalMode()

  const tasks = useTaskStore((s) => s.tasks)
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)

  const counts = useMemo(() => ({
    patients: patients.length,
    tasks: tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length,
    criticalLabs: criticalValues.filter((cv) => !cv.acknowledgedAt).length,
  }), [tasks, patients, criticalValues])

  const filteredNav = NAV_ITEMS.filter((item) => item.modes.includes(mode))
  const isDark = mode === 'acute'

  return (
    <aside
      className={clsx(
        'w-60 min-h-0 flex flex-col border-r flex-shrink-0 transition-colors duration-300',
        mode === 'ward' && 'bg-white border-neutral-200',
        mode === 'acute' && 'bg-gray-900 border-gray-700',
        mode === 'clerking' && 'bg-stone-50 border-stone-200'
      )}
    >
      {/* Mode Summary */}
      <div className={clsx(
        'px-3 pt-3 pb-2 border-b',
        isDark ? 'border-gray-800' : 'border-neutral-100'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className={clsx(
            'text-[10px] font-semibold uppercase tracking-wider',
            isDark ? 'text-slate-500' : 'text-neutral-400'
          )}>
            Clinical Mode
          </span>
          <button
            onClick={() => {
              triggerHaptic('tap')
              navigate('/mode')
            }}
            className={clsx(
              'px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-colors',
              isDark
                ? 'border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
            )}
            aria-label="Change clinical mode"
          >
            Change
          </button>
        </div>

        <div className={clsx(
          'rounded-lg px-2.5 py-2',
          isDark ? 'bg-slate-800/60 border border-slate-700/70' : 'bg-neutral-50 border border-neutral-100'
        )}>
          <p className={clsx('text-[12px] font-semibold', isDark ? 'text-slate-200' : 'text-neutral-800')}>
            {config.label}
          </p>
          <p className={clsx('text-[10px] mt-0.5 leading-relaxed', isDark ? 'text-slate-400' : 'text-neutral-500')}>
            {config.description}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" role="navigation" aria-label="Main navigation">
        {filteredNav.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          const count = item.countKey ? counts[item.countKey] : 0
          const isCritical = item.countKey === 'criticalLabs' && count > 0

          return (
            <button
              key={item.path}
              onClick={() => {
                triggerHaptic('tap')
                navigate(item.path)
              }}
              className={clsx(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors group',
                isActive && mode === 'ward' && 'bg-blue-50 text-blue-700',
                isActive && mode === 'acute' && 'bg-amber-500/15 text-amber-400',
                isActive && mode === 'clerking' && 'bg-stone-100 text-stone-700',
                !isActive && mode === 'ward' && 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700',
                !isActive && mode === 'acute' && 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                !isActive && mode === 'clerking' && 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.countKey && count > 0 && (
                <span className={clsx(
                  'min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 tabular-nums',
                  isCritical
                    ? 'bg-red-100 text-red-700'
                    : isActive
                      ? isDark ? 'bg-white/10 text-amber-300' : 'bg-white/80 text-inherit'
                      : isDark ? 'bg-gray-800 text-slate-400' : 'bg-neutral-100 text-neutral-500'
                )}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
              {isCritical && (
                <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Features & Status */}
      <div className={clsx(
        'px-3 py-2.5 border-t space-y-2',
        isDark ? 'border-gray-800' : 'border-neutral-100'
      )}>
        {/* Active feature badges */}
        <div className="flex flex-wrap gap-1">
          {FEATURE_BADGES.filter((f) => config.features[f.key] === true).map((f) => (
            <span
              key={f.key}
              className={clsx(
                'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                isDark ? DARK_BADGE_STYLES[f.color] : BADGE_STYLES[f.color]
              )}
            >
              {f.label}
            </span>
          ))}
        </div>

        {/* UI behaviour summary */}
        <div className={clsx(
          'flex items-center justify-between text-[10px]',
          isDark ? 'text-slate-500' : 'text-neutral-400'
        )}>
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              'h-1.5 w-1.5 rounded-full flex-shrink-0',
              config.refreshRate > 0 ? 'bg-green-500 animate-pulse' : isDark ? 'bg-slate-600' : 'bg-neutral-300'
            )} />
            <span>
              {config.refreshRate > 0
                ? `${config.refreshRate / 1000}s`
                : 'Manual'}
            </span>
          </div>
          <span>{NOTIFY_LABELS[config.features.notifyLevel]}</span>
        </div>
      </div>
    </aside>
  )
}
