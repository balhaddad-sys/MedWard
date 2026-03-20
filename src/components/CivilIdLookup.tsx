import { useState } from 'react'
import { Search, UserCheck, WifiOff, AlertTriangle, Loader2 } from 'lucide-react'
import { civilIdRegistry, type CivilIdRecord } from '@/services/CivilIdRegistry'
import type { PatientFormData } from '@/types/patient'

interface CivilIdLookupProps {
  onAutoFill: (data: Partial<PatientFormData>) => void
}

export function CivilIdLookup({ onAutoFill }: CivilIdLookupProps) {
  const [civilId, setCivilId] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<CivilIdRecord | null | undefined>(undefined)

  async function handleLookup() {
    const trimmed = civilId.trim()
    if (!trimmed) return

    setSearching(true)
    setResult(undefined)
    try {
      const record = await civilIdRegistry.lookup(trimmed)
      setResult(record)
    } catch (error) {
      console.error('[CivilIdLookup] Error:', error)
      setResult(null)
    } finally {
      setSearching(false)
    }
  }

  function handleAutoFill() {
    if (!result) return
    onAutoFill({
      civilId: result.civilId,
      firstName: result.firstName,
      lastName: result.lastName,
      dateOfBirth: result.dateOfBirth,
      gender: result.gender,
      nationality: result.nationality,
      bloodType: result.bloodType,
      phone: result.phone,
      emergencyContact: result.emergencyContact,
      emergencyPhone: result.emergencyPhone,
      address: result.address,
      mrn: result.mrn || '',
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={civilId}
            onChange={(e) => setCivilId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
            placeholder="Enter Civil ID to lookup..."
            className="w-full h-9 pl-8 pr-3 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleLookup}
          disabled={!civilId.trim() || searching}
          className="h-9 px-3 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
        >
          {searching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Lookup
        </button>
      </div>

      {!navigator.onLine && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <WifiOff size={12} />
          <span>Offline — searching local cache only</span>
        </div>
      )}

      {result === null && (
        <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <AlertTriangle size={13} className="text-slate-400 shrink-0" />
          No record found — enter details manually
        </div>
      )}

      {result && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                  {result.lastName}, {result.firstName}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Civil ID: {result.civilId}
                  {result.mrn && <> · MRN: {result.mrn}</>}
                  {result.dateOfBirth && <> · DOB: {result.dateOfBirth}</>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoFill}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
            >
              Auto-fill
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
