import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Patient } from '@/types'
import { theme } from '@/config/theme'
import { ACUITY_LEVELS } from '@/config/constants'
import { formatPatientName, formatAge, formatRelativeTime } from '@/utils/formatters'

interface PatientCardProps {
  patient: Patient
  compact?: boolean
  criticalLabCount?: number
  pendingTaskCount?: number
}

export function PatientCard({ patient, compact = false, criticalLabCount = 0, pendingTaskCount = 0 }: PatientCardProps) {
  const navigate = useNavigate()
  const acuity = (Number.isFinite(patient.acuity) && patient.acuity >= 1 && patient.acuity <= 5 ? patient.acuity : 3) as keyof typeof theme.acuityColors
  const acuityStyle = theme.acuityColors[acuity] ?? theme.acuityColors[3]
  const acuityInfo = ACUITY_LEVELS[acuity as keyof typeof ACUITY_LEVELS] ?? ACUITY_LEVELS[3]

  return (
    <Card hover onClick={() => navigate(`/patients/${patient.id}`)} className={clsx(compact && 'p-3')}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold', acuityStyle.bg, acuityStyle.text)}>
            {patient.bedNumber}
          </div>
          <div>
            <p className="font-semibold text-ward-text text-sm">
              {formatPatientName(patient.firstName, patient.lastName)}
            </p>
            <p className="text-xs text-ward-muted">
              MRN: {patient.mrn} | {formatAge(patient.dateOfBirth)} | {patient.gender}
            </p>
          </div>
        </div>
        <Badge variant={patient.acuity <= 2 ? 'danger' : patient.acuity === 3 ? 'warning' : 'success'} size="sm">
          {acuityInfo.label}
        </Badge>
      </div>

      {!compact && (
        <>
          <div className="mt-3">
            <p className="text-sm text-ward-text">{patient.primaryDiagnosis}</p>
            <p className="text-xs text-ward-muted mt-1">
              Dr. {patient.attendingPhysician} | {patient.team}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-ward-border">
            {criticalLabCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {criticalLabCount} critical
              </div>
            )}
            {pendingTaskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-ward-muted">
                <Clock className="h-3.5 w-3.5" />
                {pendingTaskCount} pending
              </div>
            )}
            {patient.codeStatus !== 'full' && (
              <Badge variant="outline" size="sm">{patient.codeStatus}</Badge>
            )}
            {patient.isolationPrecautions && patient.isolationPrecautions.length > 0 && (
              <Badge variant="warning" size="sm">ISO</Badge>
            )}
            <span className="ml-auto text-[10px] text-ward-muted">
              {formatRelativeTime(patient.updatedAt)}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
