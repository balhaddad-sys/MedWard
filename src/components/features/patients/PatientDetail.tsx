import { ArrowLeft, Edit, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Patient } from '@/types'
import { ACUITY_LEVELS } from '@/config/constants'
import { formatPatientName, formatAge, formatTimestamp } from '@/utils/formatters'

interface PatientDetailProps {
  patient: Patient
}

export function PatientDetail({ patient }: PatientDetailProps) {
  const navigate = useNavigate()
  const acuityKey = (patient.acuity >= 1 && patient.acuity <= 5 ? patient.acuity : 3) as keyof typeof ACUITY_LEVELS
  const acuityInfo = ACUITY_LEVELS[acuityKey]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-ward-text truncate">
              {formatPatientName(patient.firstName, patient.lastName)}
            </h1>
            <p className="text-xs sm:text-sm text-ward-muted mt-1">
              MRN: {patient.mrn} | {formatAge(patient.dateOfBirth)} | {patient.gender} | Bed {patient.bedNumber}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={patient.acuity <= 2 ? 'danger' : patient.acuity === 3 ? 'warning' : 'success'}>
              Acuity {patient.acuity} - {acuityInfo.label}
            </Badge>
            <Button variant="secondary" size="sm" icon={<Edit className="h-4 w-4" />} className="min-h-[44px]">
              Edit
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Clinical Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div><dt className="text-xs text-ward-muted">Primary Diagnosis</dt><dd className="text-sm font-medium">{patient.primaryDiagnosis}</dd></div>
              <div><dt className="text-xs text-ward-muted">Other Diagnoses</dt><dd className="text-sm">{(patient.diagnoses || []).join(', ') || 'None'}</dd></div>
              <div><dt className="text-xs text-ward-muted">Attending</dt><dd className="text-sm">Dr. {patient.attendingPhysician}</dd></div>
              <div><dt className="text-xs text-ward-muted">Team</dt><dd className="text-sm">{patient.team}</dd></div>
              <div><dt className="text-xs text-ward-muted">Code Status</dt><dd className="text-sm font-medium">{patient.codeStatus}</dd></div>
              <div><dt className="text-xs text-ward-muted">Admitted</dt><dd className="text-sm">{formatTimestamp(patient.admissionDate)}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-ward-muted">Allergies</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {(patient.allergies || []).length > 0
                    ? (patient.allergies || []).map((a) => <Badge key={a} variant="danger" size="sm">{a}</Badge>)
                    : <span className="text-sm text-green-600">NKDA</span>}
                </dd>
              </div>
              {patient.isolationPrecautions && patient.isolationPrecautions.length > 0 && (
                <div>
                  <dt className="text-xs text-ward-muted">Isolation Precautions</dt>
                  <dd className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">
                      {(patient.isolationPrecautions || []).join(', ')}
                    </span>
                  </dd>
                </div>
              )}
              {patient.weight && <div><dt className="text-xs text-ward-muted">Weight</dt><dd className="text-sm">{patient.weight} kg</dd></div>}
              {patient.height && <div><dt className="text-xs text-ward-muted">Height</dt><dd className="text-sm">{patient.height} cm</dd></div>}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
