import { useState, useRef } from 'react'
import { Search, Filter, Plus, Users, ChevronRight } from 'lucide-react'
import { usePatientStore } from '@/stores/patientStore'
import { useUIStore } from '@/stores/uiStore'
import { PatientCard } from './PatientCard'
import { Button } from '@/components/ui/Button'

type QuickFilter = 'all' | 'critical' | 'pending' | 'labs' | 'discharge'

export function PatientList() {
  const getFilteredPatients = usePatientStore((s) => s.getFilteredPatients)
  const patients = getFilteredPatients()
  const allPatients = usePatientStore((s) => s.patients)
  const searchQuery = usePatientStore((s) => s.searchQuery)
  const setSearchQuery = usePatientStore((s) => s.setSearchQuery)
  const setFilterAcuity = usePatientStore((s) => s.setFilterAcuity)
  const loading = usePatientStore((s) => s.loading)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useUIStore((s) => s.addToast)

  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all')
  const chipScrollRef = useRef<HTMLDivElement>(null)

  const handleFilterChange = (filter: QuickFilter) => {
    setActiveFilter(filter)
    switch (filter) {
      case 'all':
        setFilterAcuity(null)
        break
      case 'critical':
        setFilterAcuity(1)
        break
      case 'discharge':
        setFilterAcuity(5)
        break
      default:
        setFilterAcuity(null)
        break
    }
  }

  const handleLoadDemo = () => {
    addToast({
      type: 'info',
      title: 'Demo data',
      message: 'Add patients manually to get started.',
    })
  }

  const filterChips: { id: QuickFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: allPatients.length },
    {
      id: 'critical',
      label: 'Critical',
      count: allPatients.filter((p) => p.acuity <= 2).length,
    },
    {
      id: 'pending',
      label: 'Pending Tasks',
    },
    {
      id: 'labs',
      label: 'New Labs',
    },
    {
      id: 'discharge',
      label: 'Discharge',
      count: allPatients.filter((p) => p.acuity === 5).length,
    },
  ]

  // Additional client-side filter for non-acuity based quick filters
  const displayPatients = patients

  return (
    <div className="space-y-0">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-10 bg-ward-bg/95 backdrop-blur-sm pb-3 -mx-1 px-1">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, MRN, or bed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-ward-border rounded-xl shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ward-muted hover:text-ward-text p-0.5"
            >
              <span className="text-xs font-medium">Clear</span>
            </button>
          )}
        </div>

        {/* Quick filter chips - horizontal scrollable */}
        <div
          ref={chipScrollRef}
          className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1"
        >
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleFilterChange(chip.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === chip.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeFilter === chip.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-ward-card rounded-xl border border-ward-border p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-3/4 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          {/* Empty state illustration area */}
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <Users className="h-10 w-10 text-gray-300" />
          </div>

          <h3 className="text-base font-semibold text-ward-text mb-1">
            {searchQuery ? 'No patients match your search' : 'No patients on the ward'}
          </h3>
          <p className="text-sm text-ward-muted text-center max-w-xs mb-6">
            {searchQuery
              ? 'Try adjusting your search terms or clearing filters.'
              : 'Add your first patient to start managing the ward.'}
          </p>

          {/* Primary CTA */}
          <Button
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openModal('patient-form')}
            className="mb-3"
          >
            Add Patient
          </Button>

          {/* Secondary CTA */}
          {!searchQuery && (
            <button
              onClick={handleLoadDemo}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
            >
              Load demo data
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 pt-2">
          {/* Results count */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-ward-muted">
              {displayPatients.length} patient{displayPatients.length !== 1 ? 's' : ''}
              {searchQuery && ' found'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => openModal('patient-form')}
            >
              Add
            </Button>
          </div>

          {displayPatients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </div>
  )
}
