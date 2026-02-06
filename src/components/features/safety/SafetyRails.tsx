import { ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { SafetyBanner } from '@/components/ui/SafetyBanner'
import type { Patient, CriticalValue } from '@/types'

interface SafetyRailsProps {
  patient: Patient
  criticalValues: CriticalValue[]
}

export function SafetyRails({ patient, criticalValues }: SafetyRailsProps) {
  const warnings: string[] = []

  if (patient.allergies.length > 0) {
    warnings.push(`Allergies: ${patient.allergies.join(', ')}`)
  }
  if (patient.codeStatus !== 'full') {
    warnings.push(`Code Status: ${patient.codeStatus}`)
  }
  if (patient.isolationPrecautions && patient.isolationPrecautions.length > 0) {
    warnings.push(`Isolation: ${patient.isolationPrecautions.join(', ')}`)
  }

  return (
    <div className="space-y-3">
      {criticalValues.length > 0 && (
        <SafetyBanner
          type="critical"
          message={`${criticalValues.length} critical lab value(s) require immediate attention`}
          dismissible={false}
        />
      )}

      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-600" />
              <CardTitle>Safety Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          AI-generated content is for clinical decision support only. Always verify with primary sources and apply clinical judgment.
        </p>
      </div>
    </div>
  )
}
