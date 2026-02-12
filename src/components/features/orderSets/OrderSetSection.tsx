/**
 * Order Set Section (Phase 4)
 *
 * Checklist section for order set items
 * Groups items by severity (critical vs optional)
 */

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
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      titleColor: 'text-red-900',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    },
    optional: {
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      titleColor: 'text-gray-900',
      icon: null,
    },
  };

  const config = sectionConfig[severity];

  const priorityColors = {
    critical: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  const timingLabels = {
    STAT: 'STAT',
    '1hr': 'Within 1hr',
    '4hr': 'Within 4hr',
    '24hr': 'Within 24hr',
    routine: 'Routine',
  };

  return (
    <div className={`border ${config.borderColor} ${config.bgColor} rounded-lg p-4`}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        {config.icon}
        <h4 className={`font-semibold ${config.titleColor}`}>{title}</h4>
        <span className="text-sm text-gray-600">({items.length})</span>
      </div>

      {/* Items Checklist */}
      <div className="space-y-3">
        {items.map((item) => {
          const isSelected = selectedItems.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => onToggleItem(item.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="mt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleItem(item.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Item Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-gray-900">{item.title}</h5>
                    <div className="flex items-center gap-2 ml-4">
                      {/* Priority Badge */}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${
                          priorityColors[item.priority]
                        }`}
                      >
                        {item.priority}
                      </span>
                      {/* Timing Badge */}
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timingLabels[item.timing]}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>

                  {/* Category */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {item.category}
                    </span>
                    {item.notes && (
                      <span className="text-orange-600">
                        ⚠️ {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
