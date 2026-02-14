import { Clock, AlertTriangle } from 'lucide-react';
import type { OrderSetItem } from '@/types/orderSet';

interface OrderSetSectionProps {
  title: string;
  items: OrderSetItem[];
  selectedItems: Set<string>;
  onToggleItem: (itemId: string) => void;
  severity: 'critical' | 'optional';
}

export function OrderSetSection({
  title,
  items,
  selectedItems,
  onToggleItem,
  severity,
}: OrderSetSectionProps) {
  if (items.length === 0) return null;

  const sectionConfig = {
    critical: {
      wrapper: 'bg-red-500/10 border-red-500/30',
      titleColor: 'text-red-600',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    },
    optional: {
      wrapper: 'bg-ward-bg border-ward-border',
      titleColor: 'text-ward-text',
      icon: null,
    },
  } as const;

  const config = sectionConfig[severity];

  const priorityColors: Record<OrderSetItem['priority'], string> = {
    critical: 'bg-red-500/10 text-red-600 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
    low: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  };

  const timingLabels: Record<OrderSetItem['timing'], string> = {
    STAT: 'STAT',
    '1hr': 'Within 1hr',
    '4hr': 'Within 4hr',
    '24hr': 'Within 24hr',
    routine: 'Routine',
  };

  return (
    <section className={`rounded-xl border p-3 sm:p-4 ${config.wrapper}`}>
      <div className="flex items-center gap-2 mb-3">
        {config.icon}
        <h4 className={`font-semibold ${config.titleColor}`}>{title}</h4>
        <span className="text-xs text-ward-muted">({items.length})</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isSelected = selectedItems.has(item.id);

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggleItem(item.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onToggleItem(item.id);
                }
              }}
              className={`rounded-lg border p-3 sm:p-4 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-primary-400 bg-primary-500/10'
                  : 'border-ward-border bg-ward-card hover:border-primary-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleItem(item.id)}
                    aria-label={`Select ${item.title}`}
                    className="w-5 h-5 rounded accent-primary-600 cursor-pointer"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h5 className="font-semibold text-ward-text">{item.title}</h5>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${priorityColors[item.priority]}`}
                      >
                        {item.priority}
                      </span>

                      <span className="px-2 py-1 text-xs font-medium rounded border border-ward-border bg-ward-bg text-ward-text inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timingLabels[item.timing]}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-ward-muted mt-2">{item.description}</p>

                  <div className="mt-2 flex flex-wrap items-start gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-ward-bg text-ward-muted border border-ward-border">
                      {item.category}
                    </span>

                    {item.notes && (
                      <span className="inline-flex items-start gap-1 text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{item.notes}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
