/**
 * Order Set Button (Phase 4)
 *
 * Floating action button to trigger order set modal
 * Can be placed on patient detail page or task list
 */

import { FileText, Plus } from 'lucide-react';

interface OrderSetButtonProps {
  onClick: () => void;
  variant?: 'floating' | 'inline';
  label?: string;
}

export function OrderSetButton({
  onClick,
  variant = 'floating',
  label = 'Order Sets',
}: OrderSetButtonProps) {
  if (variant === 'floating') {
    return (
      <button
        onClick={onClick}
        className="fixed bottom-24 right-8 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105 group"
        title="Quick Order Sets"
      >
        <div className="flex items-center gap-3 px-6 py-4">
          <FileText className="w-6 h-6" />
          <span className="font-semibold text-sm">Quick Orders</span>
          <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      </button>
    );
  }

  // Inline variant
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <FileText className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
