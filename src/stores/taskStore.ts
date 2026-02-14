import { create } from 'zustand'
import { isTaskVisible } from '@/utils/taskLifecycle'
import type { Task, TaskPriority, TaskStatus } from '@/types'

interface TaskStore {
  tasks: Task[]
  filterStatus: TaskStatus | 'all'
  filterPriority: TaskPriority | 'all'
  filterAssignedTo: string | 'all'
  loading: boolean
  error: string | null
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  setFilterStatus: (status: TaskStatus | 'all') => void
  setFilterPriority: (priority: TaskPriority | 'all') => void
  setFilterAssignedTo: (assignedTo: string | 'all') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getFilteredTasks: () => Task[]
  getTasksByPatient: (patientId: string) => Task[]
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  filterStatus: 'all',
  filterPriority: 'all',
  filterAssignedTo: 'all',
  loading: false,
  error: null,
  setTasks: (tasks) => set({ tasks: tasks.filter((t) => isTaskVisible(t)) }),
  addTask: (task) =>
    set((state) => ({
      tasks: isTaskVisible(task) ? [...state.tasks, task] : state.tasks,
    })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks
        .map((t) => (t.id === id ? { ...t, ...updates } : t))
        .filter((t) => isTaskVisible(t)),
    })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setFilterAssignedTo: (filterAssignedTo) => set({ filterAssignedTo }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  getFilteredTasks: () => {
    const { tasks, filterStatus, filterPriority, filterAssignedTo } = get()
    return tasks.filter((t) => {
      const matchesStatus = filterStatus === 'all' || (t.status ?? 'pending') === filterStatus
      const matchesPriority = filterPriority === 'all' || (t.priority ?? 'medium') === filterPriority
      const matchesAssigned = filterAssignedTo === 'all' || (t.assignedTo ?? '') === filterAssignedTo
      return matchesStatus && matchesPriority && matchesAssigned
    })
  },
  getTasksByPatient: (patientId) => {
    return get().tasks.filter((t) => t.patientId === patientId)
  },
}))
