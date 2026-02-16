import { useMemo } from 'react'
import type { ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronRight, ClipboardList, Siren, Stethoscope } from 'lucide-react'
import { MODES } from '@/config/modes'
import type { ClinicalMode } from '@/config/modes'
import { APP_NAME } from '@/config/constants'
import { useClinicalMode } from '@/context/useClinicalMode'
import { triggerHaptic } from '@/utils/haptics'

const MODE_TARGET: Record<ClinicalMode, string> = {
  ward: '/',
  acute: '/on-call',
  clerking: '/clerking',
}

const MODE_META: Record<ClinicalMode, { icon: ElementType; subtitle: string; highlights: string[] }> = {
  ward: {
    icon: ClipboardList,
    subtitle: 'Routine inpatient workflow with structured follow-up.',
    highlights: ['Census and round management', 'Tasks and labs in one view', 'Handover-ready patient tracking'],
  },
  acute: {
    icon: Siren,
    subtitle: 'Fast triage and escalation for on-call and unstable patients.',
    highlights: ['Rapid critical worklist', 'Escalation-first dashboard', 'Time-sensitive task prioritization'],
  },
  clerking: {
    icon: Stethoscope,
    subtitle: 'Admission and clerking workflow with guided documentation.',
    highlights: ['Structured intake flow', 'Decision-support calculators', 'Focused plan and task generation'],
  },
}

export function ModeSelectionPage() {
  const navigate = useNavigate()
  const { mode, confirmModeSelection } = useClinicalMode()

  const modeCards = useMemo(
    () => (['ward', 'acute', 'clerking'] as ClinicalMode[]).map((modeId) => ({
      modeId,
      config: MODES[modeId],
      meta: MODE_META[modeId],
    })),
    []
  )

  const handleSelectMode = (modeId: ClinicalMode) => {
    triggerHaptic('tap')
    confirmModeSelection(modeId)
    navigate(MODE_TARGET[modeId], { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clinical Workspace Setup</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{APP_NAME}</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Select the clinical mode for this session.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {modeCards.map(({ modeId, config, meta }) => {
            const Icon = meta.icon
            const isCurrent = mode === modeId
            return (
              <button
                key={modeId}
                onClick={() => handleSelectMode(modeId)}
                className={clsx(
                  'group text-left rounded-2xl border p-5 transition-all duration-200',
                  'bg-white hover:shadow-lg hover:-translate-y-0.5',
                  isCurrent ? 'border-primary-300 shadow-md' : 'border-slate-200 hover:border-primary-200'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={clsx(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    modeId === 'acute' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                      Current
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-lg font-semibold text-slate-900">{config.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{meta.subtitle}</p>

                <div className="mt-4 space-y-1.5">
                  {meta.highlights.map((item) => (
                    <p key={item} className="text-xs text-slate-500 leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between text-sm font-medium">
                  <span className="text-primary-700">Enter Mode</span>
                  <ChevronRight className="h-4 w-4 text-primary-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
