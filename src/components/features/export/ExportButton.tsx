import { useState } from 'react'
import { Download, FileText, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

interface ExportOption {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void | Promise<void>
}

interface ExportButtonProps {
  options: ExportOption[]
  className?: string
}

export function ExportButton({ options, className }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = async (option: ExportOption) => {
    setExporting(option.id)
    try {
      await option.onClick()
    } finally {
      setExporting(null)
      setOpen(false)
    }
  }

  return (
    <div className={clsx('relative', className)}>
      <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => setOpen(!open)}>
        Export
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-ward-border py-1 z-50 animate-fade-in">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option)}
                disabled={exporting !== null}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ward-text hover:bg-gray-50 disabled:opacity-50"
              >
                {exporting === option.id ? (
                  <div className="h-4 w-4 animate-spin border-2 border-primary-600 border-t-transparent rounded-full" />
                ) : (
                  option.icon
                )}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
