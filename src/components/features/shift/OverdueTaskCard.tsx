/**
 * Overdue Task Card (Phase 2)
 *
 * Displays overdue/unacknowledged task with acknowledge button
 * Shows task details, priority, and time overdue
 */

import { Clock, User, AlertCircle, Check } from 'lucide-react';
import type { Task } from '@/types/task';

interface OverdueTaskCardProps {
  task: Task;
  onAcknowledge: () => void;
}

export function OverdueTaskCard({ task, onAcknowledge }: OverdueTaskCardProps) {
  const handleAcknowledge = async () => {
    // TODO Phase 0.2: Call acknowledgeTask service
    // await acknowledgeTask(task.id, userId);
    console.log('Acknowledge task:', task.id);
    onAcknowledge();
  };

  const priorityConfig = {
    critical: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-700',
      badgeColor: 'bg-red-100 text-red-700',
    },
    high: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-700',
      badgeColor: 'bg-orange-100 text-orange-700',
    },
    medium: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-700',
      badgeColor: 'bg-yellow-100 text-yellow-700',
    },
    low: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-700',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
  };

  const config = priorityConfig[task.priority];

  const getDueStatus = () => {
    if (!task.dueAt) return 'No due date';
    const dueDate =
      typeof task.dueAt === 'object' && 'toDate' in task.dueAt
        ? task.dueAt.toDate()
        : new Date(task.dueAt);
    const now = new Date();
    const diffMs = now.getTime() - dueDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''} overdue`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m overdue`;
    }
    return `${diffMins}m overdue`;
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 ${config.borderColor} shadow-sm hover:shadow-md transition-shadow p-4`}
    >
      <div className="flex items-start justify-between">
        {/* Task Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${config.badgeColor} uppercase`}
            >
              {task.priority}
            </span>
            <span className="text-xs text-gray-500">{task.category}</span>
          </div>

          <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>
                {task.patientName} - {task.bedNumber}
              </span>
            </div>
            <div className={`flex items-center gap-1 font-medium ${config.textColor}`}>
              <Clock className="w-4 h-4" />
              <span>{getDueStatus()}</span>
            </div>
          </div>

          {/* Assigned To */}
          <div className="mt-2 text-xs text-gray-500">
            Assigned to: {task.assignedToName || 'Unassigned'}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 ml-4">
          {!task.acknowledgedAt && (
            <button
              onClick={handleAcknowledge}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
