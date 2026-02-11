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
} from 'lucide-react'
import { clsx } from 'clsx'
import { useClinicalMode } from '@/context/useClinicalMode'
import { MODES } from '@/config/modes'
import type { ClinicalMode } from '@/config/modes'
import { triggerHaptic } from '@/utils/haptics'

const modeInfo: Record<ClinicalMode, { icon: React.ElementType; label: string; description: string }> = {
  ward: { icon: ClipboardList, label: 'Ward Round', description: 'Full patient management' },
  acute: { icon: Siren, label: 'On-Call', description: 'Acute care & escalation' },
  clinic: { icon: Stethoscope, label: 'Clinic', description: 'Outpatient documentation' },
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
  { path: '/patients', icon: Users, label: 'Patients', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
  { path: '/labs', icon: FlaskConical, label: 'Labs', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
  { path: '/handover', icon: ArrowRightLeft, label: 'Handover', modes: ['ward', 'acute'] as ClinicalMode[] },
  { path: '/ai', icon: Bot, label: 'AI Assistant', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
  { path: '/drugs', icon: Pill, label: 'Drug Info', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
  { path: '/settings', icon: Settings, label: 'Settings', modes: ['ward', 'acute', 'clinic'] as ClinicalMode[] },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode, setMode, config, isModeLocked, setModeLocked } = useClinicalMode()

  const currentModeInfo = modeInfo[mode]
  const ModeIcon = currentModeInfo.icon
  const filteredNav = navItems.filter((item) => item.modes.includes(mode))

  return (
    <aside
      className={clsx(
        'w-60 min-h-0 flex flex-col border-r flex-shrink-0 transition-colors duration-300',
        mode === 'ward' && 'bg-white border-neutral-200',
        mode === 'acute' && 'bg-gray-900 border-gray-700',
        mode === 'clinic' && 'bg-stone-50 border-stone-200'
      )}
    >
      {/* Mode Indicator */}
      <div className={clsx(
        'px-4 pt-4 pb-3',
        mode === 'acute' ? 'border-b border-gray-800' : 'border-b border-neutral-100'
      )}>
        <div className={clsx(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors',
          mode === 'ward' && 'bg-blue-50',
          mode === 'acute' && 'bg-amber-500/10',
          mode === 'clinic' && 'bg-stone-100'
        )}>
          <div className={clsx(
            'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
            mode === 'ward' && 'bg-blue-100',
            mode === 'acute' && 'bg-amber-500/20',
            mode === 'clinic' && 'bg-stone-200'
          )}>
            <ModeIcon className={clsx(
              'h-4 w-4',
              mode === 'ward' && 'text-blue-600',
              mode === 'acute' && 'text-amber-500',
              mode === 'clinic' && 'text-stone-600'
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={clsx(
              'text-xs font-bold uppercase tracking-wider leading-tight',
              mode === 'ward' && 'text-blue-700',
              mode === 'acute' && 'text-amber-500',
              mode === 'clinic' && 'text-stone-700'
            )}>
              {currentModeInfo.label}
            </p>
            <p className={clsx(
              'text-[10px] leading-tight mt-0.5',
              mode === 'acute' ? 'text-slate-500' : 'text-ward-muted'
            )}>
              {currentModeInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className={clsx(
        'px-4 py-3',
        mode === 'acute' ? 'border-b border-gray-800' : 'border-b border-neutral-100'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className={clsx(
            'text-[10px] font-semibold uppercase tracking-wider',
            mode === 'acute' ? 'text-slate-500' : 'text-ward-muted'
          )}>
            Switch Mode
          </span>
          <button
            onClick={() => {
              triggerHaptic('tap')
              setModeLocked(!isModeLocked)
            }}
            className={clsx(
              'p-1 rounded transition-colors',
              mode === 'acute' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            )}
            aria-label={isModeLocked ? 'Unlock mode switching' : 'Lock current mode'}
          >
            {isModeLocked ? (
              <Lock className="h-3 w-3 text-amber-500" />
            ) : (
              <Unlock className={clsx(
                'h-3 w-3',
                mode === 'acute' ? 'text-slate-500' : 'text-ward-muted'
              )} />
            )}
          </button>
        </div>
        <div className="space-y-1">
          {(['ward', 'acute', 'clinic'] as ClinicalMode[]).map((modeId) => {
            const info = modeInfo[modeId]
            const Icon = info.icon
            const isActive = mode === modeId
            return (
              <button
                key={modeId}
                onClick={() => {
                  triggerHaptic('tap')
                  setMode(modeId)
                }}
                disabled={isModeLocked && !isActive}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                  isActive && modeId === 'ward' && 'bg-blue-50 text-blue-700',
                  isActive && modeId === 'acute' && 'bg-amber-500/15 text-amber-500',
                  isActive && modeId === 'clinic' && 'bg-stone-100 text-stone-700',
                  !isActive && mode === 'acute' && 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                  !isActive && mode !== 'acute' && 'text-neutral-400 hover:text-neutral-600 hover:bg-gray-50',
                  isModeLocked && !isActive && 'opacity-30 cursor-not-allowed'
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{info.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {filteredNav.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
          return (
            <button
              key={item.path}
              onClick={() => {
                triggerHaptic('tap')
                navigate(item.path)
              }}
              className={clsx(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive && mode === 'ward' && 'bg-blue-50 text-blue-700',
                isActive && mode === 'acute' && 'bg-amber-500/15 text-amber-400',
                isActive && mode === 'clinic' && 'bg-stone-100 text-stone-700',
                !isActive && mode === 'ward' && 'text-neutral-500 hover:bg-gray-50 hover:text-neutral-700',
                !isActive && mode === 'acute' && 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                !isActive && mode === 'clinic' && 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Mode Features Footer */}
      <div className={clsx(
        'px-4 py-3 border-t',
        mode === 'acute' ? 'border-gray-800' : 'border-neutral-100'
      )}>
        <div className="flex flex-wrap gap-1">
          {config.features.taskEngine && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">Tasks</span>
          )}
          {config.features.timers && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Timers</span>
          )}
          {config.features.calculators && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">Calculators</span>
          )}
          {config.features.escalation && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Escalation</span>
          )}
          {config.features.smartScribe && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium">SmartText</span>
          )}
          {config.features.trendDeck && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Trends</span>
          )}
          {config.features.resultsFollowUp && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">Follow-Up</span>
          )}
          {config.features.patientEducation && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Education</span>
          )}
        </div>
        <p className={clsx(
          'text-[10px] mt-2',
          mode === 'acute' ? 'text-slate-600' : 'text-neutral-400'
        )}>
          {config.refreshRate > 0
            ? `Auto-refresh: ${config.refreshRate / 1000}s`
            : 'Manual refresh'}
        </p>
      </div>
    </aside>
  )
}
