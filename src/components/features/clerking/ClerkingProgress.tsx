/**
 * Clerking Progress (Phase 3)
 *
 * Progress indicator with 60-second timer
 * Gamifies the 60-second clerking goal
 */

import { useState, useEffect } from 'react';
import { Clock, Target } from 'lucide-react';

interface ClerkingProgressProps {
  startTime: Date;
  targetSeconds?: number;
  completionPercentage: number;
}

export function ClerkingProgress({
  startTime,
  targetSeconds = 60,
  completionPercentage,
}: ClerkingProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      setElapsedSeconds(diffSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const isUnderTarget = elapsedSeconds <= targetSeconds;
  const progressPercentage = Math.min((elapsedSeconds / targetSeconds) * 100, 100);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock
            className={`w-5 h-5 ${isUnderTarget ? 'text-green-600' : 'text-orange-600'}`}
          />
          <div>
            <p className="text-xs text-gray-600">Elapsed Time</p>
            <p
              className={`text-lg font-bold ${
                isUnderTarget ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              {formatTime(elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* Target */}
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <div className="text-right">
            <p className="text-xs text-gray-600">Target</p>
            <p className="text-lg font-bold text-blue-700">{formatTime(targetSeconds)}</p>
          </div>
        </div>

        {/* Completion */}
        <div>
          <p className="text-xs text-gray-600 text-right">Completion</p>
          <p className="text-lg font-bold text-gray-900">{completionPercentage}%</p>
        </div>
      </div>

      {/* Time Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUnderTarget ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center">
        {elapsedSeconds < targetSeconds / 2 && (
          <p className="text-xs text-green-600 font-medium">
            🎯 Great pace! Stay focused on essentials.
          </p>
        )}
        {elapsedSeconds >= targetSeconds / 2 && elapsedSeconds < targetSeconds && (
          <p className="text-xs text-blue-600 font-medium">
            ⏱️ {targetSeconds - elapsedSeconds}s remaining for quick clerking target
          </p>
        )}
        {elapsedSeconds >= targetSeconds && elapsedSeconds < targetSeconds * 1.5 && (
          <p className="text-xs text-orange-600 font-medium">
            ⚠️ Over target, but still fast! Consider quick save.
          </p>
        )}
        {elapsedSeconds >= targetSeconds * 1.5 && (
          <p className="text-xs text-gray-600">
            Taking your time for thorough documentation 📝
          </p>
        )}
      </div>
    </div>
  );
}
