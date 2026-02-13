import { useState } from 'react'
import { clsx } from 'clsx'
import { Phone, Siren, AlertTriangle, Check } from 'lucide-react'
import { triggerHaptic } from '@/utils/haptics'

interface EscalationLevel {
  id: 'senior' | 'icu' | 'met'
  icon: React.ComponentType<{ className: string }>
  label: string
  description: string
  colorBorder: string
  colorText: string
  gradient: string
}

interface EscalationPanelProps {
  onEscalate?: (level: 'senior' | 'icu' | 'met') => void
}

const ESCALATION_LEVELS: EscalationLevel[] = [
  {
    id: 'senior',
    icon: Phone,
    label: 'Call Senior',
    description: 'Request senior review',
    colorBorder: 'border-amber-500/40',
    colorText: 'text-amber-300',
    gradient: 'linear-gradient(135deg, rgba(120,85,15,0.2) 0%, rgba(50,40,10,0.25) 100%)',
  },
  {
    id: 'icu',
    icon: Siren,
    label: 'ICU / Outreach',
    description: 'ICU outreach or step-up',
    colorBorder: 'border-orange-500/40',
    colorText: 'text-orange-300',
    gradient: 'linear-gradient(135deg, rgba(124,45,18,0.25) 0%, rgba(50,25,10,0.3) 100%)',
  },
  {
    id: 'met',
    icon: AlertTriangle,
    label: 'MET / Code Blue',
    description: 'Medical emergency team',
    colorBorder: 'border-red-500/40',
    colorText: 'text-red-300',
    gradient: 'linear-gradient(135deg, rgba(127,29,29,0.3) 0%, rgba(60,20,20,0.4) 100%)',
  },
]

export function EscalationPanel({ onEscalate }: EscalationPanelProps) {
  const [confirming, setConfirming] = useState<'senior' | 'icu' | 'met' | null>(null)
  const [confirmTimeout, setConfirmTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleEscalateClick = (level: 'senior' | 'icu' | 'met') => {
    triggerHaptic('tap')

    if (confirming === level) {
      triggerHaptic('escalation')
      onEscalate?.(level)
      setConfirming(null)
      if (confirmTimeout) clearTimeout(confirmTimeout)
      setConfirmTimeout(null)
    } else {
      setConfirming(level)
      if (confirmTimeout) clearTimeout(confirmTimeout)

      const timeout = setTimeout(() => {
        setConfirming(null)
        setConfirmTimeout(null)
      }, 3000)
      setConfirmTimeout(timeout)
    }
  }

  return (
    <div className="space-y-2.5">
      {ESCALATION_LEVELS.map((escalation) => {
        const Icon = escalation.icon
        const isConfirming = confirming === escalation.id

        return (
          <button
            key={escalation.id}
            onClick={() => handleEscalateClick(escalation.id)}
            className={clsx(
              'w-full flex items-center gap-3.5 px-4 py-4 rounded-xl border transition-all min-h-[64px]',
              isConfirming
                ? clsx(
                    'ring-2 ring-offset-2 ring-offset-slate-900',
                    escalation.id === 'senior' && 'ring-amber-500',
                    escalation.id === 'icu' && 'ring-orange-500',
                    escalation.id === 'met' && 'ring-red-500'
                  )
                : '',
              escalation.colorBorder,
            )}
            style={{ background: escalation.gradient }}
          >
            <div className={clsx(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              escalation.id === 'senior' && 'bg-amber-500/15',
              escalation.id === 'icu' && 'bg-orange-500/15',
              escalation.id === 'met' && 'bg-red-500/15',
              escalation.colorText,
            )}>
              {isConfirming ? (
                <Check className="h-5 w-5" />
              ) : (
                <Icon className={clsx('h-5 w-5', escalation.id === 'met' && 'h-6 w-6')} />
              )}
            </div>

            <div className="flex-1 text-left">
              <p className={clsx('font-bold text-sm', escalation.colorText)}>
                {isConfirming ? 'Confirm?' : escalation.label}
              </p>
              <p className={clsx('text-xs mt-0.5', escalation.colorText, 'opacity-60')}>
                {escalation.description}
              </p>
            </div>

            {isConfirming && (
              <div className={clsx('text-xs font-bold tracking-wider', escalation.colorText)}>
                TAP AGAIN
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
