import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'

export function PilotBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pilot-banner-dismissed') === 'true'
  })

  const handleDismiss = () => {
    localStorage.setItem('pilot-banner-dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="bg-blue-600 text-white px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <strong className="font-semibold">Supervised Pilot Phase:</strong> This application is under active development and should only be used in supervised clinical settings with attending physician oversight. Not approved for independent clinical use.
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 hover:bg-blue-700 rounded p-1 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
