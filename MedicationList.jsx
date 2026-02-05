import { useState, useMemo } from 'react';
import { 
  Pill, Search, Filter, ChevronDown, ChevronUp, Plus,
  AlertTriangle, Clock, CheckCircle, Pause
} from 'lucide-react';
import { MedicationCard, MedicationBadge, HIGH_ALERT_CLASSES } from './MedicationCard';
import { Badge, SearchInput } from '../ui';

// Group medications by category
const MEDICATION_GROUPS = {
  scheduled: { name: 'Scheduled Medications', icon: Clock },
  prn: { name: 'PRN / As Needed', icon: Pill },
  continuous: { name: 'Continuous Infusions', icon: Pill },
  held: { name: 'Held', icon: Pause },
  discontinued: { name: 'Discontinued', icon: Pill },
};

// Sort options
const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'status', label: 'Status' },
  { value: 'nextDue', label: 'Next Due' },
  { value: 'route', label: 'Route' },
  { value: 'class', label: 'Drug Class' },
];

export function MedicationList({
  medications = [],
  groupBy = 'status', // 'status', 'route', 'class', 'none'
  showSearch = true,
  showFilters = true,
  showActions = true,
  compact = false,
  emptyMessage = 'No medications',
  onAdd,
  onEdit,
  onHold,
  onDiscontinue,
  onAdminister,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showHighAlertOnly, setShowHighAlertOnly] = useState(false);
  
  // Filter medications
  const filtered = useMemo(() => {
    return medications.filter(med => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          med.name?.toLowerCase().includes(searchLower) ||
          med.genericName?.toLowerCase().includes(searchLower) ||
          med.indication?.toLowerCase().includes(searchLower) ||
          med.drugClass?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && med.status !== statusFilter) return false;
      
      // Route filter
      if (routeFilter !== 'all' && med.route?.toUpperCase() !== routeFilter) return false;
      
      // High alert filter
      if (showHighAlertOnly) {
        const isHighAlert = HIGH_ALERT_CLASSES.some(cls =>
          med.drugClass?.toLowerCase().includes(cls) || med.name?.toLowerCase().includes(cls)
        );
        if (!isHighAlert) return false;
      }
      
      return true;
    });
  }, [medications, search, statusFilter, routeFilter, showHighAlertOnly]);
  
  // Sort medications
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'status':
          const statusOrder = { active: 0, scheduled: 1, prn: 2, held: 3, discontinued: 4, completed: 5 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        case 'nextDue':
          if (!a.nextDue) return 1;
          if (!b.nextDue) return -1;
          return new Date(a.nextDue) - new Date(b.nextDue);
        case 'route':
          return (a.route || '').localeCompare(b.route || '');
        case 'class':
          return (a.drugClass || '').localeCompare(b.drugClass || '');
        default:
          return 0;
      }
    });
  }, [filtered, sortBy]);
  
  // Group medications
  const grouped = useMemo(() => {
    if (groupBy === 'none') return { all: sorted };
    
    const groups = {};
    sorted.forEach(med => {
      let key;
      switch (groupBy) {
        case 'status':
          key = med.status || 'unknown';
          break;
        case 'route':
          key = med.route?.toUpperCase() || 'unknown';
          break;
        case 'class':
          key = med.drugClass || 'Other';
          break;
        default:
          key = 'all';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(med);
    });
    
    return groups;
  }, [sorted, groupBy]);
  
  // Get unique routes for filter
  const routes = useMemo(() => {
    const routeSet = new Set(medications.map(m => m.route?.toUpperCase()).filter(Boolean));
    return Array.from(routeSet).sort();
  }, [medications]);
  
  // Summary stats
  const stats = useMemo(() => {
    let total = medications.length;
    let active = 0, held = 0, highAlert = 0;
    
    medications.forEach(med => {
      if (med.status === 'active' || med.status === 'scheduled') active++;
      if (med.status === 'held') held++;
      if (HIGH_ALERT_CLASSES.some(cls =>
        med.drugClass?.toLowerCase().includes(cls) || med.name?.toLowerCase().includes(cls)
      )) highAlert++;
    });
    
    return { total, active, held, highAlert };
  }, [medications]);
  
  // Toggle group expansion
  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Check if group is expanded (default to true)
  const isExpanded = (key) => expandedGroups[key] !== false;
  
  if (medications.length === 0) {
    return (
      <div className="text-center py-12">
        <Pill className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">{emptyMessage}</p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="info">{stats.total} Total</Badge>
          <Badge variant="success">{stats.active} Active</Badge>
          {stats.held > 0 && <Badge variant="warning">{stats.held} Held</Badge>}
          {stats.highAlert > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {stats.highAlert} High Alert
            </Badge>
          )}
        </div>
        
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>
      
      {/* Filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-wrap gap-3">
          {showSearch && (
            <div className="flex-1 min-w-[200px]">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search medications..."
              />
            </div>
          )}
          
          {showFilters && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="prn">PRN</option>
                <option value="held">Held</option>
                <option value="discontinued">Discontinued</option>
              </select>
              
              {routes.length > 1 && (
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="all">All Routes</option>
                  {routes.map(route => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>
              )}
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              
              <button
                onClick={() => setShowHighAlertOnly(!showHighAlertOnly)}
                className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
                  showHighAlertOnly
                    ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                High Alert
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No medications match your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setRouteFilter('all');
              setShowHighAlertOnly(false);
            }}
            className="mt-2 text-brand-500 hover:text-brand-600 text-sm"
          >
            Clear filters
          </button>
        </div>
      ) : groupBy === 'none' ? (
        // Flat list
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          {sorted.map((med, idx) => (
            <MedicationCard
              key={med.id || idx}
              medication={med}
              compact={compact}
              showActions={showActions}
              onEdit={onEdit}
              onHold={onHold}
              onDiscontinue={onDiscontinue}
              onAdminister={onAdminister}
            />
          ))}
        </div>
      ) : (
        // Grouped list
        <div className="space-y-4">
          {Object.entries(grouped).map(([groupKey, meds]) => {
            const groupConfig = MEDICATION_GROUPS[groupKey];
            const GroupIcon = groupConfig?.icon || Pill;
            const expanded = isExpanded(groupKey);
            
            return (
              <div key={groupKey} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {groupConfig?.name || groupKey}
                    </span>
                    <Badge variant="info" size="sm">{meds.length}</Badge>
                  </div>
                  {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                
                {expanded && (
                  <div className={`p-4 ${compact ? 'space-y-2' : 'space-y-4'}`}>
                    {meds.map((med, idx) => (
                      <MedicationCard
                        key={med.id || idx}
                        medication={med}
                        compact={compact}
                        showActions={showActions}
                        onEdit={onEdit}
                        onHold={onHold}
                        onDiscontinue={onDiscontinue}
                        onAdminister={onAdminister}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Results count */}
      {filtered.length !== medications.length && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {filtered.length} of {medications.length} medications
        </p>
      )}
    </div>
  );
}

// Compact medication summary
export function MedicationSummary({ medications = [], maxDisplay = 5, onViewAll }) {
  const active = medications.filter(m => m.status === 'active' || m.status === 'scheduled');
  const highAlert = active.filter(m => 
    HIGH_ALERT_CLASSES.some(cls => m.drugClass?.toLowerCase().includes(cls) || m.name?.toLowerCase().includes(cls))
  );
  
  const displayed = active.slice(0, maxDisplay);
  const remaining = active.length - maxDisplay;
  
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        <Badge variant="info">{active.length} Active</Badge>
        {highAlert.length > 0 && (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {highAlert.length} High Alert
          </Badge>
        )}
      </div>
      
      {/* Medication badges */}
      <div className="flex flex-wrap gap-2">
        {displayed.map((med, idx) => (
          <MedicationBadge key={med.id || idx} medication={med} />
        ))}
        {remaining > 0 && (
          <button
            onClick={onViewAll}
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            +{remaining} more
          </button>
        )}
      </div>
    </div>
  );
}

export default MedicationList;
