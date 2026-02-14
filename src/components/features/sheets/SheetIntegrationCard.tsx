import { useState, useCallback } from 'react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useSheetIntegrationStore } from '@/stores/sheetIntegrationStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { fetchSheetAsCSV, parseWardData, exportToSheet, extractSheetId } from '@/services/sheets/googleSheets'
import { createPatient } from '@/services/firebase/patients'
import type { DoctorColorMapping } from '@/stores/sheetIntegrationStore'
import type { PatientFormData } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  '#4285F4', '#EA4335', '#34A853', '#FBBC05',
  '#FF6D01', '#46BDC6', '#7B61FF', '#E91E63',
  '#00BCD4', '#8BC34A', '#FF5722', '#607D8B',
]

const PATIENT_FIELDS = [
  { value: 'bedNumber', label: 'Bed Number' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'mrn', label: 'MRN' },
  { value: 'primaryDiagnosis', label: 'Diagnosis' },
  { value: 'attendingPhysician', label: 'Attending' },
  { value: 'team', label: 'Team' },
  { value: 'gender', label: 'Gender' },
  { value: 'dateOfBirth', label: 'DOB' },
  { value: 'allergies', label: 'Allergies' },
  { value: 'codeStatus', label: 'Code Status' },
  { value: 'acuity', label: 'Acuity' },
  { value: 'state', label: 'Status' },
  { value: 'wardId', label: 'Ward' },
]

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PreviewRow = {
  name: string
  bed: string
  mrn: string
  diagnosis: string
  ward: string
  doctor: string
  section: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DoctorColorRow({
  mapping,
  onUpdate,
  onRemove,
}: {
  mapping: DoctorColorMapping
  onUpdate: (name: string, color: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={mapping.color}
        onChange={(e) => onUpdate(mapping.name, e.target.value)}
        className="w-8 h-8 rounded border border-ward-border cursor-pointer flex-shrink-0 p-0.5"
      />
      <input
        type="text"
        value={mapping.name}
        onChange={(e) => {
          onUpdate(e.target.value, mapping.color)
        }}
        placeholder="Doctor name..."
        className="input-field text-sm flex-1 py-1.5"
      />
      <button
        onClick={onRemove}
        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 flex-shrink-0"
      >
        Remove
      </button>
    </div>
  )
}

function ImportPreviewModal({
  rows,
  onConfirm,
  onCancel,
  importing,
}: {
  rows: PreviewRow[]
  onConfirm: () => void
  onCancel: () => void
  importing: boolean
}) {
  // Group patients by section -> ward -> doctor
  const grouped = rows.reduce((acc, row) => {
    const section = row.section || 'Active'
    const ward = row.ward || 'Unassigned'
    const doctor = row.doctor || 'Unassigned Doctor'

    if (!acc[section]) acc[section] = {}
    if (!acc[section][ward]) acc[section][ward] = {}
    if (!acc[section][ward][doctor]) acc[section][ward][doctor] = []
    acc[section][ward][doctor].push(row)
    return acc
  }, {} as Record<string, Record<string, Record<string, PreviewRow[]>>>)

  // Sort sections: Active first, then chronic, then alphabetical
  const sectionEntries = Object.entries(grouped).sort((a, b) => {
    const aLower = a[0].toLowerCase()
    const bLower = b[0].toLowerCase()

    if (aLower === 'active') return -1
    if (bLower === 'active') return 1

    const aIsChronic = /\bchronic\b/i.test(aLower)
    const bIsChronic = /\bchronic\b/i.test(bLower)

    if (aIsChronic && !bIsChronic) return 1
    if (!aIsChronic && bIsChronic) return -1

    return a[0].localeCompare(b[0])
  })

  const totalWards = new Set(rows.map(r => r.ward)).size

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-ward-border">
          <h3 className="text-base font-semibold text-ward-text">
            Import Preview — {rows.length} patient{rows.length !== 1 ? 's' : ''} in {totalWards} ward{totalWards !== 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-ward-muted mt-1">
            Review the data below before importing into MedWard.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sectionEntries.map(([sectionName, wardsInSection]) => {
            const sectionPatientCount = Object.values(wardsInSection).reduce(
              (sum, doctors) => sum + Object.values(doctors).reduce((dSum, patients) => dSum + patients.length, 0),
              0
            )
            const wardEntries = Object.entries(wardsInSection).sort((a, b) => {
              if (a[0] === 'Unassigned') return 1
              if (b[0] === 'Unassigned') return -1
              return a[0].localeCompare(b[0])
            })

            const isChronic = /\bchronic\b/i.test(sectionName)

            return (
              <div key={sectionName} className={`border-2 rounded-xl overflow-hidden ${isChronic ? 'border-orange-200 bg-orange-50/30' : 'border-ward-border'}`}>
                <div className={`px-4 py-2 border-b ${isChronic ? 'bg-orange-100 border-orange-200' : 'bg-primary-50 border-primary-100'}`}>
                  <p className={`text-sm font-bold ${isChronic ? 'text-orange-900' : 'text-primary-900'}`}>
                    {sectionName} {isChronic && '(Chronic)'}
                  </p>
                  <p className={`text-xs ${isChronic ? 'text-orange-600' : 'text-primary-600'}`}>
                    {sectionPatientCount} patient{sectionPatientCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-2 p-3">
                  {wardEntries.map(([wardName, doctorsInWard]) => {
                    const wardPatientCount = Object.values(doctorsInWard).reduce((sum, patients) => sum + patients.length, 0)
                    const doctorEntries = Object.entries(doctorsInWard).sort((a, b) => a[0].localeCompare(b[0]))

                    return (
                      <div key={wardName} className="border border-ward-border rounded-lg overflow-hidden bg-white">
                        <div className="bg-gray-50 px-3 py-2 border-b border-ward-border">
                          <p className="text-sm font-bold text-ward-text">{wardName}</p>
                          <p className="text-xs text-ward-muted">{wardPatientCount} patient{wardPatientCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {doctorEntries.map(([doctorName, patients]) => (
                            <div key={doctorName} className="px-3 py-2">
                              <p className="text-xs font-semibold text-primary-600 mb-1.5">{doctorName}</p>
                              <div className="space-y-1.5">
                                {patients.map((r, i) => (
                                  <div key={i} className="pl-2 border-l-2 border-gray-200">
                                    <p className="font-medium text-ward-text text-sm">{r.name || '(no name)'}</p>
                                    <p className="text-xs text-ward-muted">
                                      {[r.bed && `Bed ${r.bed}`, r.mrn && `MRN: ${r.mrn}`, r.diagnosis].filter(Boolean).join(' · ')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-ward-border flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={importing}
            className="text-xs font-medium px-4 py-2 min-h-[36px] rounded-lg border border-ward-border hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={importing}
            className="text-xs font-medium px-4 py-2 min-h-[36px] rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${rows.length} Patients`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SheetIntegrationCard() {
  const store = useSheetIntegrationStore()
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const [urlInput, setUrlInput] = useState(store.sheetUrl)
  const [testingConnection, setTestingConnection] = useState(false)
  const [importPreview, setImportPreview] = useState<PreviewRow[] | null>(null)
  const [parsedForImport, setParsedForImport] = useState<ReturnType<typeof parseWardData>>([])
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [expandedSection, setExpandedSection] = useState<'colors' | 'columns' | 'sync' | null>(null)

  // Doctor color management — work on local copies to handle name changes
  const [editingColors, setEditingColors] = useState<DoctorColorMapping[]>(store.doctorColors)

  const handleConnect = useCallback(async () => {
    const sheetId = extractSheetId(urlInput)
    if (!sheetId) {
      addToast({ type: 'error', title: 'Invalid URL', message: 'Please enter a valid Google Sheets URL.' })
      return
    }

    setTestingConnection(true)
    try {
      const rows = await fetchSheetAsCSV(sheetId, store.sheetTabName || undefined)
      if (rows.length === 0) {
        addToast({ type: 'error', title: 'Empty sheet', message: 'The sheet appears to be empty or inaccessible.' })
        return
      }

      store.setSheetUrl(urlInput)
      store.setIsConnected(true)
      store.setSyncError(null)
      addToast({ type: 'success', title: 'Connected', message: `Found ${rows.length} rows in the sheet.` })
    } catch (err) {
      store.setSyncError(err instanceof Error ? err.message : 'Connection failed')
      addToast({ type: 'error', title: 'Connection failed', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setTestingConnection(false)
    }
  }, [urlInput, store, addToast])

  const handleDisconnect = useCallback(() => {
    store.disconnect()
    setUrlInput('')
  }, [store])

  const handleImport = useCallback(async () => {
    if (!store.sheetId) return

    store.setSyncStatus('importing')
    try {
      const rows = await fetchSheetAsCSV(store.sheetId, store.sheetTabName || undefined)
      const parsed = parseWardData(rows, store.columnMappings, {
        excludeArchived: true,
      })

      if (parsed.length === 0) {
        addToast({ type: 'error', title: 'No data', message: 'No patient data found in the sheet. Check your column mappings.' })
        store.setSyncStatus('idle')
        return
      }

      // Show preview
      setImportPreview(
        parsed.map((p) => ({
          name: [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || '(unnamed)',
          bed: p.bedNumber || '',
          mrn: p.mrn || '',
          diagnosis: p.primaryDiagnosis || '',
          ward: p.wardId || 'Unassigned',
          doctor: p.attendingPhysician || 'Unassigned Doctor',
          section: p.section || 'Active',
        }))
      )
      setParsedForImport(parsed)
      store.setSyncStatus('idle')
    } catch (err) {
      store.setSyncStatus('error')
      store.setSyncError(err instanceof Error ? err.message : 'Import failed')
      addToast({ type: 'error', title: 'Import failed', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [store, addToast])

  const handleConfirmImport = useCallback(async () => {
    if (!user?.id || parsedForImport.length === 0) return

    setImporting(true)
    let succeeded = 0

    // Process in batches for better performance and safety
    const BATCH_SIZE = 10
    for (let i = 0; i < parsedForImport.length; i += BATCH_SIZE) {
      const chunk = parsedForImport.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        chunk.map(async (p) => {
          const formData: PatientFormData = {
            mrn: p.mrn || '',
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            dateOfBirth: p.dateOfBirth || '',
            gender: p.gender,
            wardId: p.wardId || '',
            bedNumber: p.bedNumber || '',
            acuity: p.acuity,
            primaryDiagnosis: p.primaryDiagnosis || '',
            diagnoses: p.primaryDiagnosis ? [p.primaryDiagnosis] : [],
            allergies: p.allergies,
            codeStatus: p.codeStatus,
            attendingPhysician: p.attendingPhysician || '',
            team: p.team || '',
            notes: '',
          }
          await createPatient(formData, user.id)
        })
      )
      succeeded += results.filter((r) => r.status === 'fulfilled').length
    }

    // Refresh patient list from Firestore (real-time subscription will pick up new patients)
    store.setLastImportAt(Date.now())
    setImportPreview(null)
    setParsedForImport([])
    setImporting(false)
    addToast({
      type: succeeded === parsedForImport.length ? 'success' : 'error',
      title: `Imported ${succeeded} of ${parsedForImport.length} patients`,
    })
  }, [user?.id, parsedForImport, store, addToast])

  const handleExport = useCallback(async () => {
    if (!store.sheetId || !user?.id) return

    // For export, we need an OAuth token with Sheets scope
    // Prompt the user to re-authenticate with Google for Sheets access
    addToast({
      type: 'info',
      title: 'Export requires Google authorization',
      message: 'Please connect your Google account with Sheets access to export. This feature uses the Google Sheets API.',
    })

    // TODO: Implement Google OAuth re-auth with spreadsheets scope
    // For now, we'll show what would be exported
    setExporting(true)

    try {
      // Get patients from the store
      const patients = usePatientStore.getState().patients

      if (patients.length === 0) {
        addToast({ type: 'error', title: 'No patients', message: 'No patients to export.' })
        return
      }

      // Attempt export (will fail without OAuth token, but shows the flow)
      const result = await exportToSheet(
        store.sheetId,
        store.sheetTabName || 'Sheet1',
        patients,
        store.columnMappings,
        store.doctorColors,
        '' // access token — needs OAuth flow
      )

      if (result.success) {
        store.setLastExportAt(Date.now())
        addToast({ type: 'success', title: `Exported ${result.rowsWritten} patients to Google Sheet` })
      } else {
        addToast({ type: 'error', title: 'Export failed', message: result.error || 'Check permissions.' })
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Export failed', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setExporting(false)
    }
  }, [store, user?.id, addToast])

  const saveDoctorColors = useCallback(() => {
    // Clear existing and re-add
    const validColors = editingColors.filter((d) => d.name.trim())
    // Reset the store's doctor colors
    const currentColors = useSheetIntegrationStore.getState().doctorColors
    for (const dc of currentColors) {
      store.removeDoctorColor(dc.name)
    }
    for (const dc of validColors) {
      store.addDoctorColor({ name: dc.name.trim(), color: dc.color })
    }
    addToast({ type: 'success', title: 'Doctor colors saved' })
  }, [editingColors, store, addToast])

  const toggleSection = (section: 'colors' | 'columns' | 'sync') => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5 text-green-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </span>
            Sheet Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-ward-muted -mt-1">
            Connect a Google Sheet to import/export patient data. The sheet must be shared as "Anyone with the link can view".
          </p>

          {/* Connection section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ward-text">Google Sheet URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="input-field text-sm flex-1"
                disabled={store.isConnected}
              />
              {store.isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="text-xs font-medium px-4 py-2 min-h-[36px] rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={!urlInput || testingConnection}
                  className="text-xs font-medium px-4 py-2 min-h-[36px] rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {testingConnection ? 'Testing...' : 'Connect'}
                </button>
              )}
            </div>
            {store.isConnected && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Connected
              </div>
            )}
            {store.syncError && (
              <p className="text-xs text-red-600">{store.syncError}</p>
            )}
          </div>

          {/* Tab name */}
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Sheet Tab Name</label>
            <input
              type="text"
              value={store.sheetTabName}
              onChange={(e) => store.setSheetTabName(e.target.value)}
              placeholder="Sheet1"
              className="input-field text-sm"
            />
            <p className="text-xs text-ward-muted mt-1">The name of the tab within the spreadsheet to read/write.</p>
          </div>

          {/* Expandable: Doctor Color Mapping */}
          <div className="border border-ward-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('colors')}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-ward-text">Doctor Color Mapping</span>
              <svg
                className={clsx('w-4 h-4 text-ward-muted transition-transform', expandedSection === 'colors' && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedSection === 'colors' && (
              <div className="px-3 pb-3 space-y-2 border-t border-ward-border pt-3">
                <p className="text-xs text-ward-muted">
                  Assign colors to doctors. Rows will be highlighted with these colors when exporting to the sheet.
                </p>

                {editingColors.map((mapping, i) => (
                  <DoctorColorRow
                    key={i}
                    mapping={mapping}
                    onUpdate={(name, color) => {
                      setEditingColors((prev) => prev.map((d, j) => (j === i ? { name, color } : d)))
                    }}
                    onRemove={() => setEditingColors((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() =>
                      setEditingColors((prev) => [
                        ...prev,
                        { name: '', color: PRESET_COLORS[prev.length % PRESET_COLORS.length] },
                      ])
                    }
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-ward-border hover:bg-gray-50 transition-colors text-ward-muted"
                  >
                    + Add Doctor
                  </button>
                  <button
                    onClick={saveDoctorColors}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    Save Colors
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expandable: Column Mapping */}
          <div className="border border-ward-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('columns')}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-ward-text">Column Mapping</span>
              <svg
                className={clsx('w-4 h-4 text-ward-muted transition-transform', expandedSection === 'columns' && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedSection === 'columns' && (
              <div className="px-3 pb-3 space-y-2 border-t border-ward-border pt-3">
                <p className="text-xs text-ward-muted">
                  Map sheet columns (A, B, C...) to patient data fields.
                </p>

                {store.columnMappings.map((mapping, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={mapping.sheetColumn}
                      onChange={(e) => {
                        const updated = [...store.columnMappings]
                        updated[i] = { ...updated[i], sheetColumn: e.target.value }
                        store.setColumnMappings(updated)
                      }}
                      className="input-field text-sm w-16 py-1.5"
                    >
                      {COLUMN_LETTERS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <svg className="w-4 h-4 text-ward-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                    <select
                      value={mapping.patientField}
                      onChange={(e) => {
                        const updated = [...store.columnMappings]
                        updated[i] = { ...updated[i], patientField: e.target.value }
                        store.setColumnMappings(updated)
                      }}
                      className="input-field text-sm flex-1 py-1.5"
                    >
                      {PATIENT_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const updated = store.columnMappings.filter((_, j) => j !== i)
                        store.setColumnMappings(updated)
                      }}
                      className="text-xs text-red-500 hover:text-red-700 px-1 flex-shrink-0"
                    >
                      x
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const usedLetters = new Set(store.columnMappings.map((m) => m.sheetColumn))
                    const nextLetter = COLUMN_LETTERS.find((l) => !usedLetters.has(l)) || 'A'
                    const usedFields = new Set(store.columnMappings.map((m) => m.patientField))
                    const nextField = PATIENT_FIELDS.find((f) => !usedFields.has(f.value))?.value || 'bedNumber'
                    store.setColumnMappings([...store.columnMappings, { sheetColumn: nextLetter, patientField: nextField }])
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-ward-border hover:bg-gray-50 transition-colors text-ward-muted"
                >
                  + Add Column
                </button>
              </div>
            )}
          </div>

          {/* Expandable: Sync Settings */}
          <div className="border border-ward-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('sync')}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-ward-text">Sync Settings</span>
              <svg
                className={clsx('w-4 h-4 text-ward-muted transition-transform', expandedSection === 'sync' && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedSection === 'sync' && (
              <div className="px-3 pb-3 space-y-3 border-t border-ward-border pt-3">
                <div>
                  <label className="block text-xs font-medium text-ward-text mb-1">Sync Frequency</label>
                  <select
                    value={store.syncFrequency}
                    onChange={(e) => store.setSyncFrequency(e.target.value as 'manual' | '15min' | '30min' | '1hr' | '4hr')}
                    className="input-field text-sm"
                  >
                    <option value="manual">Manual only</option>
                    <option value="15min">Every 15 minutes</option>
                    <option value="30min">Every 30 minutes</option>
                    <option value="1hr">Every hour</option>
                    <option value="4hr">Every 4 hours</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-xs text-ward-muted">
                  {store.lastImportAt && (
                    <span>Last import: {new Date(store.lastImportAt).toLocaleString()}</span>
                  )}
                  {store.lastExportAt && (
                    <span>Last export: {new Date(store.lastExportAt).toLocaleString()}</span>
                  )}
                  {!store.lastImportAt && !store.lastExportAt && (
                    <span>No sync history yet.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Import / Export actions */}
          {store.isConnected && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-ward-border">
              <button
                onClick={handleImport}
                disabled={store.syncStatus === 'importing' || importing}
                className="flex-1 text-xs font-medium px-4 py-2.5 min-h-[40px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {store.syncStatus === 'importing' ? 'Reading sheet...' : 'Import from Sheet'}
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 text-xs font-medium px-4 py-2.5 min-h-[40px] rounded-lg bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export to Sheet'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import preview modal */}
      {importPreview && (
        <ImportPreviewModal
          rows={importPreview}
          onConfirm={handleConfirmImport}
          onCancel={() => { setImportPreview(null); setParsedForImport([]) }}
          importing={importing}
        />
      )}
    </>
  )
}
