import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/stores/uiStore'
import type { Toast as ToastType } from '@/stores/uiStore'

const toastConfig = {
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800', iconColor: 'text-green-500' },
  error: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800', iconColor: 'text-red-500' },
  warning: { icon: AlertCircle, bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', iconColor: 'text-yellow-500' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', iconColor: 'text-blue-500' },
}

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const config = toastConfig[toast.type]
  const Icon = config.icon

  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-up', config.bg)}>
      <Icon className={clsx('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', config.text)}>{toast.title}</p>
        {toast.message && <p className={clsx('text-sm mt-1 opacity-80', config.text)}>{toast.message}</p>}
      </div>
      <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 p-1 rounded hover:bg-black/5">
        <X className="h-4 w-4 text-gray-400" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
