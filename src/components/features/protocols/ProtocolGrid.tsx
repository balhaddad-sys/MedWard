import { clsx } from 'clsx'
import { ORDER_SETS } from '@/config/orderSets'

interface ProtocolGridProps {
  onSelectProtocol: (protocolId: string) => void
}

export function ProtocolGrid({ onSelectProtocol }: ProtocolGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {ORDER_SETS.map((orderSet) => (
          <button
            key={orderSet.id}
            onClick={() => onSelectProtocol(orderSet.id)}
            className={clsx(
              'relative p-4 rounded-xl transition-all duration-200 overflow-hidden',
              'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
              'flex flex-col items-center justify-center gap-2 min-h-32',
              orderSet.color,
              'text-white font-semibold text-sm text-center',
              'border border-white/10'
            )}
          >
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

            {/* Icon */}
            <div className="relative text-4xl">{orderSet.icon}</div>

            {/* Protocol name */}
            <div className="relative font-bold text-xs md:text-sm leading-tight">
              {orderSet.name}
            </div>

            {/* Category badge */}
            <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm rounded-lg px-2 py-0.5 text-[10px] border border-white/10">
              {orderSet.category}
            </div>

            {/* Item count indicator */}
            <div className="absolute bottom-2 left-2 bg-black/30 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center text-[10px] border border-white/10">
              {orderSet.items.length}
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-2 text-center text-xs text-slate-500">
        Tap a protocol to view full checklist and create tasks
      </div>
    </div>
  )
}
