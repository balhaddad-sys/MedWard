import { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List,
  Users,
  AlertCircle
} from 'lucide-react';
import { PatientCard, PatientCardSkeleton } from './PatientCard';
import { SearchInput } from '../ui/FormInput';
import { EmptyState } from '../ui/Spinner';
import { WARDS, PATIENT_STATUS } from '../../config/constants';

/**
 * PatientList Component
 * Displays filterable, sortable list of patients
 * 
 * @param {Array} patients - Array of patient objects
 * @param {boolean} loading - Loading state
 * @param {function} onPatientClick - Click handler for patient
 * @param {function} onQuickAction - Quick action handler
 * @param {string} defaultWard - Default ward filter
 * @param {boolean} showFilters - Show filter controls
 */
export function PatientList({
  patients = [],
  loading = false,
  onPatientClick,
  onQuickAction,
  defaultWard = null,
  showFilters = true,
}) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState(defaultWard);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list' | 'grouped'
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(term) ||
        p.fileNumber?.toLowerCase().includes(term) ||
        p.diagnosis?.toLowerCase().includes(term) ||
        p.bed?.toLowerCase().includes(term)
      );
    }

    // Ward filter
    if (selectedWard) {
      result = result.filter(p => p.ward === selectedWard);
    }

    // Status filter
    if (selectedStatus) {
      result = result.filter(p => p.status === selectedStatus);
    }

    // Sort
    result.sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case 'name':
          valA = a.name?.toLowerCase() || '';
          valB = b.name?.toLowerCase() || '';
          break;
        case 'bed':
          valA = a.bed || '';
          valB = b.bed || '';
          break;
        case 'status':
          const statusOrder = { critical: 0, guarded: 1, stable: 2 };
          valA = statusOrder[a.status] ?? 3;
          valB = statusOrder[b.status] ?? 3;
          break;
        case 'updatedAt':
        default:
          valA = a.updatedAt?.toDate?.() || new Date(a.updatedAt) || new Date(0);
          valB = b.updatedAt?.toDate?.() || new Date(b.updatedAt) || new Date(0);
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [patients, searchTerm, selectedWard, selectedStatus, sortBy, sortOrder]);

  // Group patients by ward or status
  const groupedPatients = useMemo(() => {
    if (viewMode !== 'grouped') return null;

    return filteredPatients.reduce((groups, patient) => {
      const key = selectedWard ? patient.status : patient.ward;
      if (!groups[key]) groups[key] = [];
      groups[key].push(patient);
      return groups;
    }, {});
  }, [filteredPatients, viewMode, selectedWard]);

  // Toggle sort
  const toggleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedWard(null);
    setSelectedStatus(null);
  }, []);

  // Active filter count
  const activeFilters = [selectedWard, selectedStatus, searchTerm].filter(Boolean).length;

  // Loading state
  if (loading) {
    return (
      <div className="patient-list">
        <div className="patient-list-grid">
          {[...Array(6)].map((_, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="patient-list">
      {/* Search and Filter Bar */}
      {showFilters && (
        <div className="patient-list-controls">
          <div className="search-row">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patients..."
              className="patient-search"
            />
            
            <button
              className={`filter-toggle-btn ${showFilterPanel ? 'active' : ''}`}
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Filter size={18} />
              {activeFilters > 0 && (
                <span className="filter-count">{activeFilters}</span>
              )}
            </button>

            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Card View"
              >
                <Grid size={18} />
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="filter-panel">
              <div className="filter-group">
                <label>Ward</label>
                <div className="filter-chips">
                  <button
                    className={`filter-chip ${!selectedWard ? 'active' : ''}`}
                    onClick={() => setSelectedWard(null)}
                  >
                    All
                  </button>
                  {Object.entries(WARDS).map(([key, ward]) => (
                    <button
                      key={key}
                      className={`filter-chip ${selectedWard === key ? 'active' : ''}`}
                      onClick={() => setSelectedWard(key)}
                    >
                      {ward.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <div className="filter-chips">
                  <button
                    className={`filter-chip ${!selectedStatus ? 'active' : ''}`}
                    onClick={() => setSelectedStatus(null)}
                  >
                    All
                  </button>
                  {Object.entries(PATIENT_STATUS).map(([key, status]) => (
                    <button
                      key={key}
                      className={`filter-chip status-${key} ${selectedStatus === key ? 'active' : ''}`}
                      onClick={() => setSelectedStatus(key)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <div className="filter-chips">
                  {[
                    { key: 'updatedAt', label: 'Recent' },
                    { key: 'name', label: 'Name' },
                    { key: 'bed', label: 'Bed' },
                    { key: 'status', label: 'Status' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`filter-chip ${sortBy === key ? 'active' : ''}`}
                      onClick={() => toggleSort(key)}
                    >
                      {label}
                      {sortBy === key && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilters > 0 && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="patient-list-summary">
        <span className="result-count">
          <Users size={16} />
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </span>
        {activeFilters > 0 && (
          <span className="filter-notice">
            (filtered from {patients.length})
          </span>
        )}
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={48} />}
          title="No patients found"
          description={activeFilters > 0 
            ? "Try adjusting your filters" 
            : "No patients in this ward yet"
          }
          action={activeFilters > 0 && (
            <button className="btn btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        />
      ) : viewMode === 'grouped' && groupedPatients ? (
        // Grouped View
        <div className="patient-list-grouped">
          {Object.entries(groupedPatients).map(([group, groupPatients]) => (
            <div key={group} className="patient-group">
              <h3 className="group-header">
                {WARDS[group]?.name || PATIENT_STATUS[group]?.label || group}
                <span className="group-count">{groupPatients.length}</span>
              </h3>
              <div className={`patient-list-${viewMode === 'list' ? 'rows' : 'grid'}`}>
                {groupPatients.map(patient => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onClick={onPatientClick}
                    onQuickAction={onQuickAction}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Card or List View
        <div className={`patient-list-${viewMode === 'list' ? 'rows' : 'grid'}`}>
          {filteredPatients.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={onPatientClick}
              onQuickAction={onQuickAction}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PatientList;
