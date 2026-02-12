/**
 * SBAR Card (Phase 5)
 *
 * Displays structured SBAR handover with risk flags
 * Includes copy to clipboard functionality
 */

import { useState } from 'react';
import { Copy, Check, User, Bed } from 'lucide-react';
import { SBARGenerator } from '@/services/SBARGenerator';
import { RiskFlagBadge } from './RiskFlagBadge';
import type { SBAR } from '@/services/SBARGenerator';
import type { Patient } from '@/types';

interface SBARCardProps {
  patient: Patient;
  sbar: SBAR;
}

export function SBARCard({ patient, sbar }: SBARCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const formattedText = SBARGenerator.formatForCopy(sbar, patientName);

    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-bold">
                {patient.firstName} {patient.lastName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <Bed className="w-4 h-4" />
                <span>Bed {patient.bedNumber || 'N/A'}</span>
                <span>•</span>
                <span>MRN: {patient.mrn || 'N/A'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy SBAR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Risk Flags */}
      {sbar.riskFlags.length > 0 && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h4 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>RISK FLAGS</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {sbar.riskFlags.map((flag) => (
              <RiskFlagBadge key={flag.id} flag={flag} size="md" />
            ))}
          </div>
        </div>
      )}

      {/* SBAR Sections */}
      <div className="px-6 py-6 space-y-6">
        {/* Situation */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
              S
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Situation</h4>
          </div>
          <p className="text-gray-700 ml-10">{sbar.situation}</p>
        </div>

        {/* Background */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">
              B
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Background</h4>
          </div>
          <p className="text-gray-700 ml-10">{sbar.background}</p>
        </div>

        {/* Assessment */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-sm">
              A
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Assessment</h4>
          </div>
          <p className="text-gray-700 ml-10">{sbar.assessment}</p>
        </div>

        {/* Recommendation */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
              R
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Recommendation</h4>
          </div>
          <p className="text-gray-700 ml-10">{sbar.recommendation}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        Generated at {sbar.generatedAt.toLocaleString()}
      </div>
    </div>
  );
}
