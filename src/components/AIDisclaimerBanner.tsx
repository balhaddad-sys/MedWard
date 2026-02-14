import { AlertTriangle } from 'lucide-react'
import { Card } from './ui/Card'

export function AIDisclaimerBanner() {
  return (
    <Card className="bg-amber-50 border-amber-200 mb-4">
      <div className="flex items-start gap-3 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">
            Clinical Decision Support Tool - Not a Substitute for Professional Judgment
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            This AI assistant provides suggestions only. <strong>All recommendations must be verified</strong> by a licensed healthcare professional before implementation. Do not rely solely on AI-generated content for patient care decisions. This tool is in supervised pilot phase and should not be used for emergency or time-critical decisions.
          </p>
        </div>
      </div>
    </Card>
  )
}
