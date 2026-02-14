import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DoctorColorMapping {
  name: string
  color: string
}

export interface ColumnMapping {
  sheetColumn: string
  patientField: string
}

type SyncFrequency = 'manual' | '15min' | '30min' | '1hr' | '4hr'
type SyncStatus = 'idle' | 'importing' | 'exporting' | 'success' | 'error'

interface SheetIntegrationStore {
  // Sheet connection
  sheetUrl: string
  sheetId: string
  sheetTabName: string
  isConnected: boolean

  // Doctor color mapping
  doctorColors: DoctorColorMapping[]

  // Column mapping
  columnMappings: ColumnMapping[]

  // Sync settings
  syncFrequency: SyncFrequency
  lastImportAt: number | null
  lastExportAt: number | null
  syncStatus: SyncStatus
  syncError: string | null

  // Actions
  setSheetUrl: (url: string) => void
  setSheetTabName: (name: string) => void
  setIsConnected: (connected: boolean) => void
  addDoctorColor: (mapping: DoctorColorMapping) => void
  removeDoctorColor: (name: string) => void
  updateDoctorColor: (name: string, color: string) => void
  setColumnMappings: (mappings: ColumnMapping[]) => void
  setSyncFrequency: (freq: SyncFrequency) => void
  setLastImportAt: (ts: number) => void
  setLastExportAt: (ts: number) => void
  setSyncStatus: (status: SyncStatus) => void
  setSyncError: (err: string | null) => void
  disconnect: () => void
}

function extractSheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] || ''
}

const DEFAULT_DOCTOR_COLORS: DoctorColorMapping[] = [
  { name: '', color: '#4285F4' },
]

const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[] = [
  { sheetColumn: 'A', patientField: 'bedNumber' },
  { sheetColumn: 'B', patientField: 'lastName' }, // Will be treated as full name and split
  { sheetColumn: 'C', patientField: 'primaryDiagnosis' },
  { sheetColumn: 'E', patientField: 'attendingPhysician' },
]

export const useSheetIntegrationStore = create<SheetIntegrationStore>()(
  persist(
    (set) => ({
      sheetUrl: '',
      sheetId: '',
      sheetTabName: 'Sheet1',
      isConnected: false,

      doctorColors: DEFAULT_DOCTOR_COLORS,

      columnMappings: DEFAULT_COLUMN_MAPPINGS,

      syncFrequency: 'manual',
      lastImportAt: null,
      lastExportAt: null,
      syncStatus: 'idle',
      syncError: null,

      setSheetUrl: (url) => set({ sheetUrl: url, sheetId: extractSheetId(url) }),
      setSheetTabName: (sheetTabName) => set({ sheetTabName }),
      setIsConnected: (isConnected) => set({ isConnected }),

      addDoctorColor: (mapping) =>
        set((s) => ({ doctorColors: [...s.doctorColors, mapping] })),
      removeDoctorColor: (name) =>
        set((s) => ({ doctorColors: s.doctorColors.filter((d) => d.name !== name) })),
      updateDoctorColor: (name, color) =>
        set((s) => ({
          doctorColors: s.doctorColors.map((d) =>
            d.name === name ? { ...d, color } : d
          ),
        })),

      setColumnMappings: (columnMappings) => set({ columnMappings }),
      setSyncFrequency: (syncFrequency) => set({ syncFrequency }),
      setLastImportAt: (lastImportAt) => set({ lastImportAt }),
      setLastExportAt: (lastExportAt) => set({ lastExportAt }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setSyncError: (syncError) => set({ syncError }),

      disconnect: () =>
        set({
          sheetUrl: '',
          sheetId: '',
          sheetTabName: 'Sheet1',
          isConnected: false,
          lastImportAt: null,
          lastExportAt: null,
          syncStatus: 'idle',
          syncError: null,
        }),
    }),
    {
      name: 'medward-sheet-integration',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (version <= 2) {
          // v0/v1/v2 → v3: reset column mappings to match actual sheet structure
          // (A=bed, B=name, C=diagnosis, E=doctor)
          state.columnMappings = DEFAULT_COLUMN_MAPPINGS
        }
        return state
      },
    }
  )
)
