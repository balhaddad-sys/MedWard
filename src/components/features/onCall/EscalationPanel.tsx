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
  colorBg: string
  colorText: string
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
    colorBorder: 'border-amber-500/50',
    colorBg: 'bg-amber-600/20',
    colorText: 'text-amber-300',
  },
  {
    id: 'icu',
    icon: Siren,
    label: 'ICU / Outreach',
    description: 'ICU outreach or step-up',
    colorBorder: 'border-orange-500/50',
    colorBg: 'bg-orange-600/20',
    colorText: 'text-orange-300',
  },
  {
    id: 'met',
    icon: AlertTriangle,
    label: 'MET / Code Blue',
    description: 'Medical emergency team',
    colorBorder: 'border-red-500/50',
    colorBg: 'bg-red-600/20',
    colorText: 'text-red-300',
  },
]

export function EscalationPanel({ onEscalate }: EscalationPanelProps) {
  const [confirming, setConfirming] = useState<'senior' | 'icu' | 'met' | null>(null)
  const [confirmTimeout, setConfirmTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleEscalateClick = (level: 'senior' | 'icu' | 'met') => {
    triggerHaptic('tap')

    if (confirming === level) {
      // Second tap - execute
      triggerHaptic('escalation')
      onEscalate?.(level)
      setConfirming(null)
      if (confirmTimeout) clearTimeout(confirmTimeout)
      setConfirmTimeout(null)
    } else {
      // First tap - show confirmation
      setConfirming(level)
      if (confirmTimeout) clearTimeout(confirmTimeout)

      // Auto-reset after 3 seconds
      const timeout = setTimeout(() => {
        setConfirming(null)
        setConfirmTimeout(null)
      }, 3000)
      setConfirmTimeout(timeout)
    }
  }

  return (
    <div className="space-y-2">
      {ESCALATION_LEVELS.map((escalation) => {
        const Icon = escalation.icon
        const isConfirming = confirming === escalation.id

        return (
          <button
            key={escalation.id}
            onClick={() => handleEscalateClick(escalation.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all',
              'min-h-[56px]',
              isConfirming
                ? clsx(
                    'ring-2 ring-offset-2 ring-offset-slate-900',
                    escalation.id === 'senior' && 'ring-amber-500',
                    escalation.id === 'icu' && 'ring-orange-500',
                    escalation.id === 'met' && 'ring-red-500'
                  )
                : '',
              escalation.colorBorder,
              escalation.colorBg
            )}
          >
            <div className={clsx('flex-shrink-0', escalation.colorText)}>
              {isConfirming ? (
                <Check className="h-6 w-6" />
              ) : (
                <Icon className="h-6 w-6" />
              )}
            </div>

            <div className="flex-1 text-left">
              <p className={clsx('font-semibold text-sm', escalation.colorText)}>
                {isConfirming ? 'Confirm?' : escalation.label}
              </p>
              <p className={clsx('text-xs', escalation.colorText, 'opacity-75')}>
                {escalation.description}
              </p>
            </div>

            {isConfirming && (
              <div className={clsx('text-xs font-bold', escalation.colorText)}>
                TAP AGAIN
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
