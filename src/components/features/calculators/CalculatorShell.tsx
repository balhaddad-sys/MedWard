import { clsx } from 'clsx'
import { CloseIcon } from '@/components/icons/MedicalIcons'

export interface CalculatorShellProps {
  title: string
  icon: React.ReactNode
  iconColor?: string
  description?: string
  children: React.ReactNode
  onClose?: () => void
}

export function CalculatorShell({
  title,
  icon,
  iconColor = 'text-blue-400',
  description,
  children,
  onClose,
}: CalculatorShellProps) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/40 border-b border-slate-700/40 px-6 py-4 flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={clsx('flex-shrink-0 pt-1', iconColor)}>{icon}</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="text-sm text-slate-300 mt-1">{description}</p>}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 ml-4"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">{children}</div>
    </div>
  )
}
