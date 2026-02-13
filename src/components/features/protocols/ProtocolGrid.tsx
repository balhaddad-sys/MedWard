import { clsx } from 'clsx'
import { ORDER_SETS } from '@/config/orderSets'
import { PROTOCOL_ICON_MAP } from '@/components/icons/protocolIconMap'

interface ProtocolGridProps {
  onSelectProtocol: (protocolId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  cardiac: 'text-red-400',
  infectious: 'text-purple-400',
  metabolic: 'text-orange-400',
  neurological: 'text-indigo-400',
  respiratory: 'text-teal-400',
  renal: 'text-cyan-400',
  gastrointestinal: 'text-rose-400',
  other: 'text-slate-400',
}

export function ProtocolGrid({ onSelectProtocol }: ProtocolGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {ORDER_SETS.map((orderSet) => {
          const IconComponent = PROTOCOL_ICON_MAP[orderSet.id]
          const colorClass = CATEGORY_COLORS[orderSet.category] || 'text-slate-400'

          return (
            <button
              key={orderSet.id}
              onClick={() => onSelectProtocol(orderSet.id)}
              className={clsx(
                'group flex flex-col items-center gap-1.5 p-3 rounded-xl',
                'bg-slate-900/40 border border-slate-700/50',
                'hover:border-slate-500/60 hover:bg-slate-800/60',
                'active:scale-[0.97] transition-all text-center'
              )}
            >
              {IconComponent ? (
                <IconComponent
                  className={clsx(
                    'w-7 h-7 transition-transform group-hover:scale-110',
                    colorClass
                  )}
                />
              ) : (
                <span className="text-2xl">{orderSet.icon}</span>
              )}

              <span className={clsx('text-xs font-bold leading-tight', colorClass)}>
                {orderSet.name}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">
                  {orderSet.items.length} steps
                </span>
                {orderSet.sources && orderSet.sources.length > 0 && (
                  <span className="text-[9px] bg-emerald-900/40 text-emerald-400 px-1 rounded">
                    EBM
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
