/**
 * Clerking Section (Phase 3)
 *
 * Collapsible wrapper for clerking form sections
 * Supports progressive disclosure for 60-second clerking path
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

interface ClerkingSectionProps {
  title: string;
  isRequired?: boolean;
  isComplete?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function ClerkingSection({
  title,
  isRequired = false,
  isComplete = false,
  defaultExpanded = false,
  children,
  icon,
}: ClerkingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}

          {/* Section Icon (optional) */}
          {icon && <div className="text-gray-600">{icon}</div>}

          {/* Title */}
          <h3 className="text-base font-semibold text-gray-900">
            {title}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>

        {/* Completion Indicator */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Complete</span>
            </div>
          ) : isRequired ? (
            <div className="flex items-center gap-1 text-orange-600">
              <Circle className="w-5 h-5" />
              <span className="text-sm font-medium">Required</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-400">
              <Circle className="w-5 h-5" />
              <span className="text-sm font-medium">Optional</span>
            </div>
          )}
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-gray-200">{children}</div>
      )}
    </div>
  );
}
