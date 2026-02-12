/**
 * Clerking Quick Save (Phase 3)
 *
 * Floating quick save button shown after minimal required fields are complete
 * Enables 60-second clerking workflow
 */

import { Save, CheckCircle } from 'lucide-react';

interface ClerkingQuickSaveProps {
  isVisible: boolean;
  onQuickSave: () => void;
  isSaving?: boolean;
  completionPercentage?: number;
}

export function ClerkingQuickSave({
  isVisible,
  onQuickSave,
  isSaving = false,
  completionPercentage = 0,
}: ClerkingQuickSaveProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 max-w-xs">
        {/* Quick Save Message */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-full bg-green-100">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">Ready to Save!</h4>
            <p className="text-xs text-gray-600 mt-1">
              Minimum required fields complete. You can quick save now and continue later.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {completionPercentage > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Completion</span>
              <span className="text-xs font-semibold text-gray-900">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Save Button */}
        <button
          onClick={onQuickSave}
          disabled={isSaving}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Quick Save Draft</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-2">
          You can continue editing later
        </p>
      </div>
    </div>
  );
}
