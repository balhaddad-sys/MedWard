import { useMemo } from 'react';
import { 
  Heart, Activity, Thermometer, Wind, Droplets, 
  TrendingUp, TrendingDown, Minus, AlertTriangle, Clock
} from 'lucide-react';
import { Badge } from '../ui';

// Vital signs reference ranges
const VITAL_REFERENCES = {
  hr: {
    name: 'Heart Rate',
    shortName: 'HR',
    unit: 'bpm',
    icon: Heart,
    low: 60,
    high: 100,
    critical_low: 40,
    critical_high: 150,
  },
  sbp: {
    name: 'Systolic BP',
    shortName: 'SBP',
    unit: 'mmHg',
    icon: Activity,
    low: 90,
    high: 140,
    critical_low: 70,
    critical_high: 180,
  },
  dbp: {
    name: 'Diastolic BP',
    shortName: 'DBP',
    unit: 'mmHg',
    icon: Activity,
    low: 60,
    high: 90,
    critical_low: 40,
    critical_high: 120,
  },
  map: {
    name: 'Mean Arterial Pressure',
    shortName: 'MAP',
    unit: 'mmHg',
    icon: Activity,
    low: 65,
    high: 105,
    critical_low: 50,
    critical_high: 130,
  },
  temp: {
    name: 'Temperature',
    shortName: 'Temp',
    unit: '°C',
    icon: Thermometer,
    low: 36.0,
    high: 37.5,
    critical_low: 35.0,
    critical_high: 39.5,
  },
  rr: {
    name: 'Respiratory Rate',
    shortName: 'RR',
    unit: '/min',
    icon: Wind,
    low: 12,
    high: 20,
    critical_low: 8,
    critical_high: 30,
  },
  spo2: {
    name: 'Oxygen Saturation',
    shortName: 'SpO₂',
    unit: '%',
    icon: Droplets,
    low: 94,
    high: 100,
    critical_low: 88,
    critical_high: null, // Can't be too high
  },
  gcs: {
    name: 'Glasgow Coma Scale',
    shortName: 'GCS',
    unit: '/15',
    icon: Activity,
    low: 15,
    high: 15,
    critical_low: 8,
    critical_high: null,
  },
};

// Get status based on value
const getVitalStatus = (key, value) => {
  const ref = VITAL_REFERENCES[key];
  if (!ref || value === null || value === undefined) return 'unknown';
  
  const num = parseFloat(value);
  if (isNaN(num)) return 'unknown';
  
  if (ref.critical_low && num < ref.critical_low) return 'critical-low';
  if (ref.critical_high && num > ref.critical_high) return 'critical-high';
  if (num < ref.low) return 'low';
  if (num > ref.high) return 'high';
  return 'normal';
};

// Parse BP string to get SBP and DBP
const parseBP = (bp) => {
  if (!bp || typeof bp !== 'string') return { sbp: null, dbp: null, map: null };
  const match = bp.match(/(\d+)\s*[\/\\]\s*(\d+)/);
  if (!match) return { sbp: null, dbp: null, map: null };
  const sbp = parseInt(match[1]);
  const dbp = parseInt(match[2]);
  const map = Math.round((sbp + 2 * dbp) / 3);
  return { sbp, dbp, map };
};

// Status styles
const STATUS_STYLES = {
  'normal': {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-500',
  },
  'low': {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-500',
  },
  'high': {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-500',
  },
  'critical-low': {
    text: 'text-rose-600 dark:text-rose-400 font-bold',
    bg: 'bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-300 dark:ring-rose-700',
    icon: 'text-rose-500',
  },
  'critical-high': {
    text: 'text-rose-600 dark:text-rose-400 font-bold',
    bg: 'bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-300 dark:ring-rose-700',
    icon: 'text-rose-500',
  },
  'unknown': {
    text: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    icon: 'text-gray-400',
  },
};

// Single vital card
export function VitalCard({ vitalKey, value, previousValue, timestamp, compact = false }) {
  const ref = VITAL_REFERENCES[vitalKey];
  if (!ref) return null;
  
  const status = getVitalStatus(vitalKey, value);
  const styles = STATUS_STYLES[status];
  const isCritical = status.includes('critical');
  const Icon = ref.icon;
  
  // Calculate delta
  const delta = previousValue !== undefined && previousValue !== null
    ? parseFloat(value) - parseFloat(previousValue)
    : null;
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${styles.bg}`}>
        <Icon className={`w-4 h-4 ${styles.icon}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">{ref.shortName}</span>
        <span className={`font-semibold ${styles.text}`}>{value ?? '—'}</span>
        <span className="text-xs text-gray-400">{ref.unit}</span>
      </div>
    );
  }
  
  return (
    <div className={`p-4 rounded-xl ${styles.bg} transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-gray-900/30`}>
            <Icon className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{ref.shortName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{ref.name}</p>
          </div>
        </div>
        {isCritical && <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${styles.text}`}>
            {value ?? '—'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{ref.unit}</span>
        </div>
        
        {delta !== null && delta !== 0 && (
          <div className={`flex items-center gap-1 text-sm ${delta > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
            {delta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Ref: {ref.low}-{ref.high}</span>
        {timestamp && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

// Blood pressure specific card
export function BPCard({ bp, previousBp, timestamp, compact = false }) {
  const current = parseBP(bp);
  const previous = parseBP(previousBp);
  
  const sbpStatus = getVitalStatus('sbp', current.sbp);
  const dbpStatus = getVitalStatus('dbp', current.dbp);
  const mapStatus = getVitalStatus('map', current.map);
  
  // Use worst status
  const worstStatus = [sbpStatus, dbpStatus].some(s => s.includes('critical'))
    ? (sbpStatus.includes('critical') ? sbpStatus : dbpStatus)
    : [sbpStatus, dbpStatus].some(s => s === 'high' || s === 'low')
      ? (sbpStatus !== 'normal' ? sbpStatus : dbpStatus)
      : 'normal';
  
  const styles = STATUS_STYLES[worstStatus];
  const isCritical = worstStatus.includes('critical');
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${styles.bg}`}>
        <Activity className={`w-4 h-4 ${styles.icon}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">BP</span>
        <span className={`font-semibold ${styles.text}`}>{bp || '—/—'}</span>
        <span className="text-xs text-gray-400">mmHg</span>
      </div>
    );
  }
  
  return (
    <div className={`p-4 rounded-xl ${styles.bg} transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/50 dark:bg-gray-900/30">
            <Activity className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Blood Pressure</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Systolic/Diastolic</p>
          </div>
        </div>
        {isCritical && <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />}
      </div>
      
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-3xl font-bold ${styles.text}`}>
          {bp || '—/—'}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">mmHg</span>
      </div>
      
      {current.map && (
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={mapStatus === 'normal' ? 'success' : mapStatus.includes('critical') ? 'danger' : 'warning'} size="sm">
            MAP: {current.map}
          </Badge>
        </div>
      )}
      
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Ref: 90-140 / 60-90</span>
        {timestamp && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

// Full vitals grid
export function VitalsGrid({ vitals = {}, previousVitals = {}, timestamp, compact = false, columns = 3 }) {
  // Extract values
  const { hr, bp, temp, rr, spo2, gcs } = vitals;
  const prev = previousVitals || {};
  
  // Summary of abnormalities
  const summary = useMemo(() => {
    const checks = [
      { key: 'hr', value: hr },
      { key: 'temp', value: temp },
      { key: 'rr', value: rr },
      { key: 'spo2', value: spo2 },
    ];
    
    // Add BP checks
    if (bp) {
      const { sbp, dbp } = parseBP(bp);
      checks.push({ key: 'sbp', value: sbp });
      checks.push({ key: 'dbp', value: dbp });
    }
    
    let normal = 0, abnormal = 0, critical = 0;
    checks.forEach(({ key, value }) => {
      if (value === null || value === undefined) return;
      const status = getVitalStatus(key, value);
      if (status === 'normal') normal++;
      else if (status.includes('critical')) critical++;
      else abnormal++;
    });
    
    return { normal, abnormal, critical };
  }, [hr, bp, temp, rr, spo2]);
  
  const hasVitals = hr || bp || temp || rr || spo2 || gcs;
  
  if (!hasVitals) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No vital signs recorded</p>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {hr && <VitalCard vitalKey="hr" value={hr} previousValue={prev.hr} compact />}
        {bp && <BPCard bp={bp} previousBp={prev.bp} compact />}
        {temp && <VitalCard vitalKey="temp" value={temp} previousValue={prev.temp} compact />}
        {rr && <VitalCard vitalKey="rr" value={rr} previousValue={prev.rr} compact />}
        {spo2 && <VitalCard vitalKey="spo2" value={spo2} previousValue={prev.spo2} compact />}
        {gcs && <VitalCard vitalKey="gcs" value={gcs} previousValue={prev.gcs} compact />}
      </div>
    );
  }
  
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div className="space-y-4">
      {/* Summary */}
      {(summary.critical > 0 || summary.abnormal > 0) && (
        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {summary.critical > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {summary.critical} Critical
            </Badge>
          )}
          {summary.abnormal > 0 && (
            <Badge variant="warning">{summary.abnormal} Abnormal</Badge>
          )}
          {summary.normal > 0 && (
            <Badge variant="success">{summary.normal} Normal</Badge>
          )}
        </div>
      )}
      
      {/* Grid */}
      <div className={`grid ${gridCols[columns] || gridCols[3]} gap-4`}>
        {hr && <VitalCard vitalKey="hr" value={hr} previousValue={prev.hr} timestamp={timestamp} />}
        {bp && <BPCard bp={bp} previousBp={prev.bp} timestamp={timestamp} />}
        {temp && <VitalCard vitalKey="temp" value={temp} previousValue={prev.temp} timestamp={timestamp} />}
        {rr && <VitalCard vitalKey="rr" value={rr} previousValue={prev.rr} timestamp={timestamp} />}
        {spo2 && <VitalCard vitalKey="spo2" value={spo2} previousValue={prev.spo2} timestamp={timestamp} />}
        {gcs && <VitalCard vitalKey="gcs" value={gcs} previousValue={prev.gcs} timestamp={timestamp} />}
      </div>
    </div>
  );
}

// Inline vitals summary
export function VitalsInline({ vitals = {} }) {
  const { hr, bp, temp, rr, spo2 } = vitals;
  
  const items = [
    hr && `HR ${hr}`,
    bp && `BP ${bp}`,
    temp && `T ${temp}°C`,
    rr && `RR ${rr}`,
    spo2 && `SpO₂ ${spo2}%`,
  ].filter(Boolean);
  
  if (items.length === 0) return null;
  
  return (
    <span className="text-sm text-gray-600 dark:text-gray-400">
      {items.join(' • ')}
    </span>
  );
}

export { VITAL_REFERENCES, getVitalStatus, parseBP };
