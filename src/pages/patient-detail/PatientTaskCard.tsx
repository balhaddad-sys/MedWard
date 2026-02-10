import { CheckCircle, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/utils/formatters'
import type { Task } from '@/types'
import { clsx } from 'clsx'

export interface PatientTaskCardProps {
  task: Task
  onComplete?: () => void
  onEdit?: () => void
  onDelete?: () => void
  isConfirmingDelete?: boolean
  onCancelDelete?: () => void
}

export function PatientTaskCard({ task, onComplete, onEdit, onDelete, isConfirmingDelete, onCancelDelete }: PatientTaskCardProps) {
  const isCompleted = (task.status ?? 'pending') === 'completed'
  const priority = task.priority ?? 'medium'
  const priorityColors: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-400',
    low: 'border-l-green-400',
  }

  return (
    <div className={clsx(
      'border rounded-lg p-3 border-l-4 transition-colors',
      isCompleted ? 'opacity-60 border-l-green-400 bg-gray-50' : priorityColors[priority] || '',
      !isCompleted && 'border-ward-border'
    )}>
      <div className="flex items-start gap-2">
        {!isCompleted && onComplete && (
          <button onClick={onComplete} aria-label={`Mark "${task.title}" as complete`} className="mt-0.5 p-1 rounded-lg text-ward-muted hover:text-green-600 hover:bg-green-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={clsx('text-sm font-medium truncate', isCompleted && 'line-through text-ward-muted')}>{task.title}</p>
            <Badge variant={priority === 'critical' ? 'danger' : priority === 'high' ? 'warning' : 'default'} size="sm">{priority}</Badge>
          </div>
          {task.description && <p className="text-xs text-ward-muted mt-0.5 line-clamp-1">{task.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ward-muted">
            {task.assignedToName && <span>{task.assignedToName}</span>}
            {task.dueAt && <span>{formatRelativeTime(task.dueAt)}</span>}
            {isCompleted && <span className="text-green-600 font-medium">✓ Done</span>}
          </div>
        </div>
        {!isCompleted && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button onClick={onEdit} aria-label={`Edit "${task.title}"`} className="p-1.5 rounded-lg text-ward-muted hover:text-primary-600 hover:bg-primary-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && !isConfirmingDelete && (
              <button onClick={onDelete} aria-label={`Delete "${task.title}"`} className="p-1.5 rounded-lg text-ward-muted hover:text-red-600 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Delete task">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {isConfirmingDelete && (
              <div className="flex items-center gap-1">
                <button onClick={onCancelDelete} className="px-2 py-1 rounded text-xs font-medium text-ward-muted hover:bg-gray-100 transition-colors min-h-[36px]">
                  Cancel
                </button>
                <button onClick={onDelete} className="px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors min-h-[36px]">
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
