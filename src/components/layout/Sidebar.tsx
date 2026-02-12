import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ArrowRightLeft,
  Settings,
  FlaskConical,
  Bot,
  Pill,
  ClipboardList,
  Siren,
  Stethoscope,
  Lock,
  Unlock,
  Circle,
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

const MODE_META: Record<ClinicalMode, { icon: React.ElementType; label: string; shortLabel: string; color: string }> = {
  ward: { icon: ClipboardList, label: 'Ward Round', shortLabel: 'Ward', color: 'blue' },
  acute: { icon: Siren, label: 'On-Call', shortLabel: 'Acute', color: 'amber' },
  clerking: { icon: Stethoscope, label: 'Clerking', shortLabel: 'Clerk', color: 'stone' },
}

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[] },
  { path: '/patients', icon: Users, label: 'Patients', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[], countKey: 'patients' as const },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[], countKey: 'tasks' as const },
  { path: '/labs', icon: FlaskConical, label: 'Labs', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[], countKey: 'criticalLabs' as const },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[] },
  { path: '/ai', icon: Bot, label: 'AI Assistant', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[] },
  { path: '/drugs', icon: Pill, label: 'Drug Info', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[] },
  { path: '/settings', icon: Settings, label: 'Settings', modes: ['ward', 'acute', 'clerking'] as ClinicalMode[] },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, setMode, config, isModeLocked, setModeLocked } = useClinicalMode()

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
      {/* Mode Switcher */}
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
              setModeLocked(!isModeLocked)
            }}
            className={clsx(
              'p-1 rounded-md transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            )}
            aria-label={isModeLocked ? 'Unlock mode switching' : 'Lock current mode'}
            title={isModeLocked ? 'Mode locked — click to unlock' : 'Click to lock current mode'}
          >
            {isModeLocked ? (
              <Lock className="h-3 w-3 text-amber-500" />
            ) : (
              <Unlock className={clsx('h-3 w-3', isDark ? 'text-slate-500' : 'text-neutral-400')} />
            )}
          </button>
        </div>

        {/* Segmented control */}
        <div className={clsx(
          'flex rounded-lg p-0.5 gap-0.5',
          isDark ? 'bg-gray-800' : 'bg-neutral-100'
        )}>
          {(['ward', 'acute', 'clerking'] as ClinicalMode[]).map((modeId) => {
            const meta = MODE_META[modeId]
            const Icon = meta.icon
            const isActive = mode === modeId
            const disabled = isModeLocked && !isActive

            return (
              <button
                key={modeId}
                onClick={() => {
                  if (disabled) return
                  triggerHaptic('tap')
                  setMode(modeId)
                }}
                disabled={disabled}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                  isActive && modeId === 'ward' && 'bg-blue-600 text-white shadow-sm',
                  isActive && modeId === 'acute' && 'bg-amber-500 text-white shadow-sm',
                  isActive && modeId === 'clerking' && 'bg-stone-600 text-white shadow-sm',
                  !isActive && isDark && 'text-slate-500 hover:text-slate-300',
                  !isActive && !isDark && 'text-neutral-400 hover:text-neutral-600',
                  disabled && 'opacity-30 cursor-not-allowed'
                )}
                aria-label={`Switch to ${meta.label} mode`}
                aria-current={isActive ? 'true' : undefined}
              >
                <Icon className="h-3 w-3" />
                <span>{meta.shortLabel}</span>
              </button>
            )
          })}
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
