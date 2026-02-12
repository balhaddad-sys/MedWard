/**
 * Safety Validation Modal (Phase 1)
 *
 * Displays validation blockers and warnings before saving clinical data
 * Blockers prevent save, warnings require confirmation
 */

import React from 'react';
import type { ValidationResult, ValidationIssue } from '@/utils/safetyValidators';

interface SafetyValidationModalProps {
  isOpen: boolean;
  validationResult: ValidationResult;
  onClose: () => void;
  onProceed?: () => void; // Only available if canProceed is true
  title?: string;
}

export function SafetyValidationModal({
  isOpen,
  validationResult,
  onClose,
  onProceed,
  title = 'Safety Validation',
}: SafetyValidationModalProps) {
  if (!isOpen) return null;

  const { blockers, warnings, canProceed } = validationResult;
  const hasBlockers = blockers.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b ${
            hasBlockers ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {hasBlockers
              ? 'The following issues must be resolved before saving'
              : 'Review the following warnings before proceeding'}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {/* Blockers Section */}
          {hasBlockers && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-red-900">
                  Critical Issues ({blockers.length})
                </h3>
              </div>
              <div className="space-y-3">
                {blockers.map((issue, index) => (
                  <ValidationIssueCard key={index} issue={issue} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings Section */}
          {hasWarnings && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-yellow-900">
                  Warnings ({warnings.length})
                </h3>
              </div>
              <div className="space-y-3">
                {warnings.map((issue, index) => (
                  <ValidationIssueCard key={index} issue={issue} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {canProceed ? 'Cancel' : 'Close'}
          </button>
          {canProceed && onProceed && (
            <button
              onClick={onProceed}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {hasWarnings ? 'Save Anyway' : 'Proceed'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual validation issue card
 */
function ValidationIssueCard({ issue }: { issue: ValidationIssue }) {
  const isBlocker = issue.level === 'blocker';

  return (
    <div
      className={`p-4 rounded-md border ${
        isBlocker
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              isBlocker ? 'text-red-900' : 'text-yellow-900'
            }`}
          >
            {issue.message}
          </p>
          {issue.suggestedFix && (
            <p
              className={`text-sm mt-1 ${
                isBlocker ? 'text-red-700' : 'text-yellow-700'
              }`}
            >
              <span className="font-medium">Fix:</span> {issue.suggestedFix}
            </p>
          )}
          <p
            className={`text-xs mt-1 ${
              isBlocker ? 'text-red-600' : 'text-yellow-600'
            }`}
          >
            Field: <code className="font-mono">{issue.field}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
