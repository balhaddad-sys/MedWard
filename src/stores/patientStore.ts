import { create } from 'zustand'
import type { Patient, LabPanel, CriticalValue } from '@/types'

interface PatientStore {
  patients: Patient[]
  selectedPatient: Patient | null
  labPanels: Record<string, LabPanel[]>
  criticalValues: CriticalValue[]
  searchQuery: string
  filterAcuity: number | null
  loading: boolean
  error: string | null
  setPatients: (patients: Patient[]) => void
  setSelectedPatient: (patient: Patient | null) => void
  addPatient: (patient: Patient) => void
  updatePatient: (id: string, updates: Partial<Patient>) => void
  removePatient: (id: string) => void
  setLabPanels: (patientId: string, panels: LabPanel[]) => void
  addLabPanel: (patientId: string, panel: LabPanel) => void
  setCriticalValues: (values: CriticalValue[]) => void
  setSearchQuery: (query: string) => void
  setFilterAcuity: (acuity: number | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getFilteredPatients: () => Patient[]
}

export const usePatientStore = create<PatientStore>()((set, get) => ({
  patients: [],
  selectedPatient: null,
  labPanels: {},
  criticalValues: [],
  searchQuery: '',
  filterAcuity: null,
  loading: false,
  error: null,
  setPatients: (patients) => set({ patients }),
  setSelectedPatient: (selectedPatient) => set({ selectedPatient }),
  addPatient: (patient) => set((state) => ({ patients: [...state.patients, patient] })),
  updatePatient: (id, updates) =>
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      selectedPatient:
        state.selectedPatient?.id === id
          ? { ...state.selectedPatient, ...updates }
          : state.selectedPatient,
    })),
  removePatient: (id) =>
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
      selectedPatient: state.selectedPatient?.id === id ? null : state.selectedPatient,
    })),
  setLabPanels: (patientId, panels) =>
    set((state) => ({ labPanels: { ...state.labPanels, [patientId]: panels } })),
  addLabPanel: (patientId, panel) =>
    set((state) => ({
      labPanels: {
        ...state.labPanels,
        [patientId]: [...(state.labPanels[patientId] || []), panel],
      },
    })),
  setCriticalValues: (criticalValues) => set({ criticalValues }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterAcuity: (filterAcuity) => set({ filterAcuity }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  getFilteredPatients: () => {
    const { patients, searchQuery, filterAcuity } = get()
    return patients.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        `${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.mrn ?? '').includes(searchQuery) ||
        (p.bedNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesAcuity = filterAcuity === null || p.acuity === filterAcuity
      return matchesSearch && matchesAcuity
    })
  },
}))
