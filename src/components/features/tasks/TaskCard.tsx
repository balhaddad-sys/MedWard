import { Clock, User, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Task } from '@/types'
import { theme } from '@/config/theme'
import { formatRelativeTime } from '@/utils/formatters'

interface TaskCardProps {
  task: Task
  onComplete?: () => void
  onClick?: () => void
}

export function TaskCard({ task, onComplete, onClick }: TaskCardProps) {
  const priorityStyle = theme.priorityColors[task.priority]

  return (
    <Card hover onClick={onClick} className="relative">
      <div className={clsx('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', priorityStyle.badge)} />
      <div className="pl-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ward-text">{task.title}</h3>
              <Badge variant={task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'default'} size="sm">
                {task.priority}
              </Badge>
            </div>
            <p className="text-xs text-ward-muted mt-1">
              {task.patientName} - Bed {task.bedNumber}
            </p>
          </div>
          {task.status !== 'completed' && onComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete() }}
              className="p-1.5 rounded-lg text-ward-muted hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-ward-muted mt-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-ward-muted">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {task.assignedToName}
          </span>
          {task.dueAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(task.dueAt)}
            </span>
          )}
          <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'default'} size="sm">
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
