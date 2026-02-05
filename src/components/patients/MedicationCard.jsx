import { 
  Pill, Clock, AlertTriangle, CheckCircle, Pause, XCircle,
  Info, Syringe, Droplets, Wind, Zap
} from 'lucide-react';
import { Badge } from '../ui';

// Route icons
const ROUTE_ICONS = {
  PO: Pill,
  IV: Syringe,
  IM: Syringe,
  SC: Syringe,
  INH: Wind,
  NEB: Wind,
  TOP: Droplets,
  PR: Pill,
  SL: Pill,
  TD: Droplets,
  default: Pill,
};

// Route display names
const ROUTE_NAMES = {
  PO: 'Oral',
  IV: 'Intravenous',
  IM: 'Intramuscular',
  SC: 'Subcutaneous',
  INH: 'Inhaled',
  NEB: 'Nebulized',
  TOP: 'Topical',
  PR: 'Rectal',
  SL: 'Sublingual',
  TD: 'Transdermal',
  NG: 'NG Tube',
  IT: 'Intrathecal',
  IO: 'Intraosseous',
};

// Status colors
const STATUS_STYLES = {
  active: {
    badge: 'success',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
  },
  scheduled: {
    badge: 'info',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
  },
  prn: {
    badge: 'warning',
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
  },
  held: {
    badge: 'warning',
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    border: 'border-amber-300 dark:border-amber-700',
    icon: 'text-amber-500',
  },
  discontinued: {
    badge: 'danger',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-300 dark:border-gray-700',
    icon: 'text-gray-400',
  },
  completed: {
    badge: 'default',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    icon: 'text-gray-400',
  },
};

// Priority indicators
const PRIORITY_STYLES = {
  stat: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', label: 'STAT' },
  urgent: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'URGENT' },
  routine: { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', label: 'ROUTINE' },
};

// Drug class badges (for high-alert medications)
const HIGH_ALERT_CLASSES = [
  'anticoagulant',
  'insulin',
  'opioid',
  'chemotherapy',
  'neuromuscular blocker',
  'concentrated electrolyte',
  'vasopressor',
  'sedative',
];

// Format frequency display
const formatFrequency = (freq) => {
  const freqMap = {
    'QD': 'Once daily',
    'BID': 'Twice daily',
    'TID': 'Three times daily',
    'QID': 'Four times daily',
    'Q4H': 'Every 4 hours',
    'Q6H': 'Every 6 hours',
    'Q8H': 'Every 8 hours',
    'Q12H': 'Every 12 hours',
    'PRN': 'As needed',
    'STAT': 'Immediately',
    'NOW': 'Now',
    'ONCE': 'One time',
    'HS': 'At bedtime',
    'AC': 'Before meals',
    'PC': 'After meals',
    'CONT': 'Continuous',
  };
  return freqMap[freq?.toUpperCase()] || freq;
};

export function MedicationCard({ 
  medication, 
  compact = false, 
  showActions = true,
  onEdit,
  onHold,
  onDiscontinue,
  onAdminister
}) {
  const {
    name,
    genericName,
    dose,
    unit,
    route,
    frequency,
    status = 'active',
    priority = 'routine',
    drugClass,
    indication,
    instructions,
    startDate,
    endDate,
    lastAdministered,
    nextDue,
    warnings = [],
    interactions = [],
  } = medication;
  
  const styles = STATUS_STYLES[status] || STATUS_STYLES.active;
  const priorityStyle = PRIORITY_STYLES[priority] || PRIORITY_STYLES.routine;
  const RouteIcon = ROUTE_ICONS[route?.toUpperCase()] || ROUTE_ICONS.default;
  const isHighAlert = HIGH_ALERT_CLASSES.some(cls => 
    drugClass?.toLowerCase().includes(cls) || name?.toLowerCase().includes(cls)
  );
  const isDiscontinued = status === 'discontinued' || status === 'completed';
  
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${styles.border} ${styles.bg} ${isDiscontinued ? 'opacity-60' : ''}`}>
        <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700`}>
          <RouteIcon className={`w-4 h-4 ${styles.icon}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${isDiscontinued ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
              {name}
            </span>
            {isHighAlert && <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dose} {unit} {route} {frequency}
          </p>
        </div>
        
        <Badge variant={styles.badge} size="sm">{status}</Badge>
      </div>
    );
  }
  
  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} overflow-hidden ${isDiscontinued ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${isHighAlert ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <RouteIcon className={`w-5 h-5 ${isHighAlert ? 'text-rose-500' : styles.icon}`} />
            </div>
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-semibold ${isDiscontinued ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {name}
                </h3>
                {isHighAlert && (
                  <Badge variant="danger" size="sm" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    High Alert
                  </Badge>
                )}
                {priority !== 'routine' && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${priorityStyle.bg} ${priorityStyle.color}`}>
                    {priorityStyle.label}
                  </span>
                )}
              </div>
              {genericName && genericName !== name && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{genericName}</p>
              )}
            </div>
          </div>
          
          <Badge variant={styles.badge}>{status}</Badge>
        </div>
      </div>
      
      {/* Dosing info */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Dose</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{dose} {unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Route</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{ROUTE_NAMES[route?.toUpperCase()] || route}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Frequency</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{formatFrequency(frequency)}</p>
          </div>
          {drugClass && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Class</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{drugClass}</p>
            </div>
          )}
        </div>
        
        {indication && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Indication</p>
            <p className="text-gray-700 dark:text-gray-300">{indication}</p>
          </div>
        )}
        
        {instructions && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">{instructions}</p>
            </div>
          </div>
        )}
        
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2 mb-4">
            {warnings.map((warning, idx) => (
              <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">{warning}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Interactions */}
        {interactions.length > 0 && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Drug Interactions</p>
                <ul className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                  {interactions.map((int, idx) => (
                    <li key={idx}>• {int}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Timing */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {startDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Started: {new Date(startDate).toLocaleDateString()}
            </div>
          )}
          {endDate && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              End: {new Date(endDate).toLocaleDateString()}
            </div>
          )}
          {lastAdministered && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Last: {new Date(lastAdministered).toLocaleString()}
            </div>
          )}
          {nextDue && status === 'active' && (
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
              Next: {new Date(nextDue).toLocaleString()}
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      {showActions && !isDiscontinued && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
          {onAdminister && (
            <button
              onClick={() => onAdminister(medication)}
              className="px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Administer
            </button>
          )}
          {onHold && status === 'active' && (
            <button
              onClick={() => onHold(medication)}
              className="px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4 inline mr-1" />
              Hold
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(medication)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
          {onDiscontinue && (
            <button
              onClick={() => onDiscontinue(medication)}
              className="px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4 inline mr-1" />
              D/C
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Mini medication badge for inline display
export function MedicationBadge({ medication }) {
  const { name, dose, unit, route, status } = medication;
  const isActive = status === 'active' || status === 'scheduled';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      isActive 
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    }`}>
      <Pill className="w-3 h-3" />
      {name} {dose}{unit} {route}
    </span>
  );
}

export { ROUTE_NAMES, HIGH_ALERT_CLASSES, formatFrequency };
