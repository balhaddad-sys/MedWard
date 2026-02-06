import { useState } from 'react'
import { Search, Filter, Plus } from 'lucide-react'
import { usePatientStore } from '@/stores/patientStore'
import { useUIStore } from '@/stores/uiStore'
import { PatientCard } from './PatientCard'
import { Button } from '@/components/ui/Button'

export function PatientList() {
  const patients = usePatientStore((s) => s.getFilteredPatients())
  const searchQuery = usePatientStore((s) => s.searchQuery)
  const setSearchQuery = usePatientStore((s) => s.setSearchQuery)
  const filterAcuity = usePatientStore((s) => s.filterAcuity)
  const setFilterAcuity = usePatientStore((s) => s.setFilterAcuity)
  const loading = usePatientStore((s) => s.loading)
  const openModal = useUIStore((s) => s.openModal)
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted" />
          <input
            type="text"
            placeholder="Search by name, MRN, or bed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <Button variant="ghost" size="sm" icon={<Filter className="h-4 w-4" />} onClick={() => setShowFilters(!showFilters)}>
          Filter
        </Button>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openModal('patient-form')}>
          Add
        </Button>
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {[null, 1, 2, 3, 4, 5].map((acuity) => (
            <button
              key={String(acuity)}
              onClick={() => setFilterAcuity(acuity)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterAcuity === acuity ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {acuity === null ? 'All' : `Acuity ${acuity}`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-ward-muted">
          <p className="text-lg font-medium">No patients found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </div>
  )
}
