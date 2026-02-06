import { useState, useRef, useCallback } from 'react'
import { Plus, Filter, CheckSquare, Clock, ChevronDown, Beaker, Image, MessageSquare, LogOut, Pill, MoreHorizontal } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { TaskCard } from './TaskCard'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import type { Task } from '@/types'

/* ------------------------------------------------------------------ */
/*  SwipeableTaskCard                                                 */
/* ------------------------------------------------------------------ */

interface SwipeableTaskCardProps {
  task: Task
  onComplete: (task: Task) => void
  onDefer: (task: Task) => void
  onClick: () => void
}

function SwipeableTaskCard({ task, onComplete, onDefer, onClick }: SwipeableTaskCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [deltaX, setDeltaX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null)

  const THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    lockedRef.current = null
    setIsSwiping(false)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = currentX - startXRef.current
    const diffY = currentY - startYRef.current

    // Lock direction after 10px of movement
    if (lockedRef.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      lockedRef.current = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical'
    }

    if (lockedRef.current === 'vertical') return

    if (lockedRef.current === 'horizontal') {
      e.preventDefault()
      setIsSwiping(true)
      // Dampen the movement past threshold
      const clamped = Math.max(-160, Math.min(160, diffX))
      setDeltaX(clamped)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (deltaX > THRESHOLD && task.status !== 'completed') {
      onComplete(task)
    } else if (deltaX < -THRESHOLD) {
      onDefer(task)
    }
    setDeltaX(0)
    setIsSwiping(false)
    lockedRef.current = null
  }, [deltaX, task, onComplete, onDefer])

  const swipeProgress = Math.abs(deltaX) / THRESHOLD
  const isRightSwipe = deltaX > 0
  const isLeftSwipe = deltaX < 0

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Background reveal layers */}
      {/* Right swipe = complete (green) */}
      <div
        className="absolute inset-0 flex items-center pl-5 rounded-xl transition-opacity"
        style={{
          backgroundColor: isRightSwipe ? `rgba(34, 197, 94, ${Math.min(swipeProgress, 1) * 0.9})` : 'transparent',
          opacity: isRightSwipe ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 text-white font-medium text-sm">
          <CheckSquare className="h-5 w-5" />
          {swipeProgress >= 1 && <span>Done</span>}
        </div>
      </div>

      {/* Left swipe = defer (orange) */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-xl transition-opacity"
        style={{
          backgroundColor: isLeftSwipe ? `rgba(249, 115, 22, ${Math.min(swipeProgress, 1) * 0.9})` : 'transparent',
          opacity: isLeftSwipe ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 text-white font-medium text-sm">
          {swipeProgress >= 1 && <span>Defer</span>}
          <Clock className="h-5 w-5" />
        </div>
      </div>

      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${deltaX}px)`,
          transition: isSwiping ? 'none' : 'transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
        className="relative z-10"
      >
        <TaskCard
          task={task}
          onClick={!isSwiping ? onClick : undefined}
          onComplete={task.status !== 'completed' ? () => onComplete(task) : undefined}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick Add Templates                                               */
/* ------------------------------------------------------------------ */

const QUICK_TEMPLATES = [
  { id: 'lab', label: 'Labs', icon: Beaker, category: 'lab' as const },
  { id: 'imaging', label: 'Imaging', icon: Image, category: 'imaging' as const },
  { id: 'consult', label: 'Consult', icon: MessageSquare, category: 'consult' as const },
  { id: 'discharge', label: 'Discharge', icon: LogOut, category: 'discharge' as const },
  { id: 'medication', label: 'Meds', icon: Pill, category: 'medication' as const },
  { id: 'other', label: 'Other', icon: MoreHorizontal, category: 'other' as const },
] as const

/* ------------------------------------------------------------------ */
/*  TaskList                                                          */
/* ------------------------------------------------------------------ */

export function TaskList() {
  const getFilteredTasks = useTaskStore((s) => s.getFilteredTasks)
  const tasks = getFilteredTasks()
  const filterStatus = useTaskStore((s) => s.filterStatus)
  const setFilterStatus = useTaskStore((s) => s.setFilterStatus)
  const loading = useTaskStore((s) => s.loading)
  const updateTask = useTaskStore((s) => s.updateTask)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useUIStore((s) => s.addToast)

  const allTasks = useTaskStore((s) => s.tasks)
  const pendingCount = allTasks.filter((t) => t.status === 'pending').length
  const inProgressCount = allTasks.filter((t) => t.status === 'in_progress').length
  const completedCount = allTasks.filter((t) => t.status === 'completed').length

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [lastAction, setLastAction] = useState<{ taskId: string; prevStatus: string } | null>(null)

  const tabs = [
    { id: 'all', label: 'All', count: allTasks.length },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount },
    { id: 'completed', label: 'Done', count: completedCount },
  ]

  const handleComplete = useCallback(
    (task: Task) => {
      const prevStatus = task.status
      updateTask(task.id, { status: 'completed' })
      setLastAction({ taskId: task.id, prevStatus })
      addToast({
        type: 'success',
        title: 'Task completed',
        message: task.title,
        duration: 5000,
      })
    },
    [updateTask, addToast]
  )

  const handleDefer = useCallback(
    (task: Task) => {
      const prevStatus = task.status
      updateTask(task.id, { status: 'pending' })
      setLastAction({ taskId: task.id, prevStatus })
      addToast({
        type: 'warning',
        title: 'Task deferred',
        message: task.title,
        duration: 5000,
      })
    },
    [updateTask, addToast]
  )

  const handleUndo = useCallback(() => {
    if (!lastAction) return
    updateTask(lastAction.taskId, { status: lastAction.prevStatus as Task['status'] })
    setLastAction(null)
    addToast({
      type: 'info',
      title: 'Action undone',
      duration: 2000,
    })
  }, [lastAction, updateTask, addToast])

  const handleQuickAdd = (category: string) => {
    setShowQuickAdd(false)
    openModal('task-form', { defaultCategory: category })
  }

  return (
    <div className="space-y-0 relative">
      {/* Sticky tabs */}
      <div className="sticky top-0 z-10 bg-ward-bg/95 backdrop-blur-sm pb-3 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-2">
          <div className="overflow-x-auto no-scrollbar flex-1">
            <Tabs
              tabs={tabs}
              activeTab={filterStatus}
              onChange={(id) => setFilterStatus(id as typeof filterStatus)}
            />
          </div>

          {/* Quick Add button */}
          <div className="relative flex-shrink-0">
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="whitespace-nowrap"
            >
              <span className="hidden sm:inline">Add Task</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showQuickAdd ? 'rotate-180' : ''}`} />
            </Button>

            {/* Quick Add dropdown / bottom sheet */}
            {showQuickAdd && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowQuickAdd(false)}
                />

                {/* Dropdown panel */}
                <div className="absolute right-0 top-full mt-2 z-30 w-56 bg-white rounded-xl border border-ward-border shadow-lg overflow-hidden animate-fade-in">
                  <div className="px-3 py-2 border-b border-ward-border">
                    <p className="text-xs font-semibold text-ward-muted uppercase tracking-wider">
                      Quick Add Template
                    </p>
                  </div>
                  <div className="py-1">
                    {QUICK_TEMPLATES.map((tmpl) => {
                      const Icon = tmpl.icon
                      return (
                        <button
                          key={tmpl.id}
                          onClick={() => handleQuickAdd(tmpl.category)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-ward-text hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <Icon className="h-4 w-4 text-ward-muted" />
                          {tmpl.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Undo bar */}
      {lastAction && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-2 bg-gray-800 text-white rounded-xl animate-fade-in">
          <span className="text-sm">Action applied</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-primary-300 hover:text-primary-200 active:text-primary-400 transition-colors"
          >
            Undo
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-ward-card rounded-xl border border-ward-border p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-1 w-1 rounded-full bg-gray-200 mt-2" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                    <div className="h-4 w-14 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="flex gap-3 mt-2">
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          {/* Empty state illustration */}
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <CheckSquare className="h-10 w-10 text-gray-300" />
          </div>

          <h3 className="text-base font-semibold text-ward-text mb-1">
            {filterStatus === 'all' ? 'No tasks yet' : `No ${filterStatus.replace('_', ' ')} tasks`}
          </h3>
          <p className="text-sm text-ward-muted text-center max-w-xs mb-6">
            {filterStatus === 'all'
              ? 'Create tasks to track labs, consults, imaging, and more.'
              : 'Tasks will appear here when their status matches this filter.'}
          </p>

          {/* Primary CTA */}
          <Button
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openModal('task-form')}
            className="mb-4"
          >
            Add Task
          </Button>

          {/* Template quick links */}
          {filterStatus === 'all' && (
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_TEMPLATES.slice(0, 4).map((tmpl) => {
                const Icon = tmpl.icon
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleQuickAdd(tmpl.category)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tmpl.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {/* Swipe hint - show once */}
          <p className="text-[11px] text-ward-muted text-center px-4 sm:hidden">
            Swipe right to complete, left to defer
          </p>

          {tasks.map((task) => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onDefer={handleDefer}
              onClick={() => openModal('task-detail', { taskId: task.id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
