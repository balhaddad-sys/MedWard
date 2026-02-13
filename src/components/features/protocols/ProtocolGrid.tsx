import { clsx } from 'clsx'
import { ORDER_SETS } from '@/config/orderSets'

interface ProtocolGridProps {
  onSelectProtocol: (protocolId: string) => void
}

/**
 * Grid of emergency protocol buttons
 * Displays ORDER_SETS as large touch-friendly buttons
 */
export function ProtocolGrid({ onSelectProtocol }: ProtocolGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {ORDER_SETS.map((orderSet) => (
          <button
            key={orderSet.id}
            onClick={() => onSelectProtocol(orderSet.id)}
            className={clsx(
              'relative p-4 rounded-lg transition-all duration-200',
              'hover:shadow-lg hover:scale-105 active:scale-95',
              'flex flex-col items-center justify-center gap-2 min-h-32',
              orderSet.color,
              'text-white font-semibold text-sm text-center'
            )}
          >
            {/* Icon */}
            <div className="text-4xl">{orderSet.icon}</div>

            {/* Protocol name */}
            <div className="font-bold text-xs md:text-sm leading-tight">
              {orderSet.name}
            </div>

            {/* Category badge */}
            <div className="absolute top-2 right-2 bg-black/20 rounded px-2 py-1 text-xs">
              {orderSet.category}
            </div>

            {/* Item count indicator */}
            <div className="absolute bottom-2 left-2 bg-black/20 rounded-full w-6 h-6 flex items-center justify-center text-xs">
              {orderSet.items.length}
            </div>
          </button>
        ))}
      </div>

      {/* Helper text */}
      <div className="px-4 py-2 text-center text-sm text-slate-400">
        Tap a protocol to view full checklist and create tasks
      </div>
    </div>
  )
}
