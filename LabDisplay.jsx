import { useState, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, 
  Minus, Clock, FlaskConical, Droplets, Heart, Activity
} from 'lucide-react';
import { Badge } from '../ui';

// Kuwait SI unit reference ranges
const LAB_REFERENCES = {
  // Renal Panel
  creatinine: { name: 'Creatinine', unit: 'µmol/L', low: 62, high: 106, critical_low: 30, critical_high: 350 },
  urea: { name: 'Urea', unit: 'mmol/L', low: 2.5, high: 6.7, critical_high: 35 },
  egfr: { name: 'eGFR', unit: 'mL/min/1.73m²', low: 60, high: 120, critical_low: 15 },
  
  // Electrolytes
  sodium: { name: 'Sodium', unit: 'mmol/L', low: 136, high: 145, critical_low: 120, critical_high: 160 },
  potassium: { name: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.0, critical_low: 2.5, critical_high: 6.5 },
  chloride: { name: 'Chloride', unit: 'mmol/L', low: 98, high: 106, critical_low: 80, critical_high: 120 },
  bicarbonate: { name: 'Bicarbonate', unit: 'mmol/L', low: 22, high: 28, critical_low: 10, critical_high: 40 },
  calcium: { name: 'Calcium', unit: 'mmol/L', low: 2.15, high: 2.55, critical_low: 1.5, critical_high: 3.5 },
  phosphate: { name: 'Phosphate', unit: 'mmol/L', low: 0.8, high: 1.5, critical_low: 0.3, critical_high: 3.0 },
  magnesium: { name: 'Magnesium', unit: 'mmol/L', low: 0.7, high: 1.0, critical_low: 0.4, critical_high: 2.0 },
  
  // Hematology
  wbc: { name: 'WBC', unit: '×10⁹/L', low: 4.0, high: 11.0, critical_low: 1.0, critical_high: 30.0 },
  hgb: { name: 'Hemoglobin', unit: 'g/L', low: 120, high: 160, critical_low: 70, critical_high: 200 },
  hct: { name: 'Hematocrit', unit: '%', low: 36, high: 48 },
  plt: { name: 'Platelets', unit: '×10⁹/L', low: 150, high: 400, critical_low: 20, critical_high: 1000 },
  mcv: { name: 'MCV', unit: 'fL', low: 80, high: 100 },
  mch: { name: 'MCH', unit: 'pg', low: 27, high: 32 },
  mchc: { name: 'MCHC', unit: 'g/L', low: 320, high: 360 },
  rdw: { name: 'RDW', unit: '%', low: 11.5, high: 14.5 },
  neutrophils: { name: 'Neutrophils', unit: '%', low: 40, high: 70 },
  lymphocytes: { name: 'Lymphocytes', unit: '%', low: 20, high: 40 },
  
  // Coagulation
  pt: { name: 'PT', unit: 's', low: 11, high: 13.5, critical_high: 30 },
  inr: { name: 'INR', unit: '', low: 0.9, high: 1.1, critical_high: 5.0 },
  ptt: { name: 'PTT', unit: 's', low: 25, high: 35, critical_high: 100 },
  fibrinogen: { name: 'Fibrinogen', unit: 'g/L', low: 2.0, high: 4.0, critical_low: 1.0 },
  dDimer: { name: 'D-Dimer', unit: 'mg/L FEU', low: 0, high: 0.5, critical_high: 4.0 },
  
  // Liver Panel
  alt: { name: 'ALT', unit: 'U/L', low: 7, high: 56, critical_high: 1000 },
  ast: { name: 'AST', unit: 'U/L', low: 10, high: 40, critical_high: 1000 },
  alp: { name: 'ALP', unit: 'U/L', low: 44, high: 147 },
  ggt: { name: 'GGT', unit: 'U/L', low: 9, high: 48 },
  bilirubin: { name: 'Total Bilirubin', unit: 'µmol/L', low: 5, high: 21, critical_high: 300 },
  directBili: { name: 'Direct Bilirubin', unit: 'µmol/L', low: 0, high: 5 },
  albumin: { name: 'Albumin', unit: 'g/L', low: 35, high: 50, critical_low: 20 },
  totalProtein: { name: 'Total Protein', unit: 'g/L', low: 60, high: 80 },
  
  // Cardiac Markers
  troponin: { name: 'Troponin I', unit: 'ng/L', low: 0, high: 14, critical_high: 100 },
  bnp: { name: 'BNP', unit: 'pg/mL', low: 0, high: 100, critical_high: 500 },
  ntProBnp: { name: 'NT-proBNP', unit: 'pg/mL', low: 0, high: 125, critical_high: 2000 },
  ck: { name: 'CK', unit: 'U/L', low: 30, high: 200 },
  ckMb: { name: 'CK-MB', unit: 'U/L', low: 0, high: 25 },
  ldh: { name: 'LDH', unit: 'U/L', low: 140, high: 280 },
  
  // Inflammatory
  crp: { name: 'CRP', unit: 'mg/L', low: 0, high: 5, critical_high: 100 },
  esr: { name: 'ESR', unit: 'mm/hr', low: 0, high: 20 },
  procalcitonin: { name: 'Procalcitonin', unit: 'ng/mL', low: 0, high: 0.1, critical_high: 2.0 },
  ferritin: { name: 'Ferritin', unit: 'µg/L', low: 30, high: 300 },
  
  // Metabolic
  glucose: { name: 'Glucose', unit: 'mmol/L', low: 3.9, high: 5.5, critical_low: 2.8, critical_high: 25 },
  hba1c: { name: 'HbA1c', unit: '%', low: 4, high: 5.6 },
  lactate: { name: 'Lactate', unit: 'mmol/L', low: 0.5, high: 2.0, critical_high: 4.0 },
  ammonia: { name: 'Ammonia', unit: 'µmol/L', low: 10, high: 35, critical_high: 100 },
  uricAcid: { name: 'Uric Acid', unit: 'µmol/L', low: 200, high: 430 },
  
  // Thyroid
  tsh: { name: 'TSH', unit: 'mIU/L', low: 0.4, high: 4.0 },
  freeT4: { name: 'Free T4', unit: 'pmol/L', low: 12, high: 22 },
  freeT3: { name: 'Free T3', unit: 'pmol/L', low: 3.1, high: 6.8 },
  
  // ABG
  ph: { name: 'pH', unit: '', low: 7.35, high: 7.45, critical_low: 7.1, critical_high: 7.6 },
  pco2: { name: 'pCO₂', unit: 'mmHg', low: 35, high: 45, critical_low: 20, critical_high: 70 },
  po2: { name: 'pO₂', unit: 'mmHg', low: 80, high: 100, critical_low: 40 },
  hco3: { name: 'HCO₃', unit: 'mmol/L', low: 22, high: 26, critical_low: 10, critical_high: 40 },
  baseExcess: { name: 'Base Excess', unit: 'mmol/L', low: -2, high: 2, critical_low: -10, critical_high: 10 },
};

// Lab categories for grouping
const LAB_CATEGORIES = {
  renal: { name: 'Renal', icon: Droplets, labs: ['creatinine', 'urea', 'egfr'] },
  electrolytes: { name: 'Electrolytes', icon: Activity, labs: ['sodium', 'potassium', 'chloride', 'bicarbonate', 'calcium', 'phosphate', 'magnesium'] },
  hematology: { name: 'Hematology', icon: Droplets, labs: ['wbc', 'hgb', 'hct', 'plt', 'mcv', 'mch', 'mchc', 'rdw', 'neutrophils', 'lymphocytes'] },
  coagulation: { name: 'Coagulation', icon: Clock, labs: ['pt', 'inr', 'ptt', 'fibrinogen', 'dDimer'] },
  liver: { name: 'Liver', icon: FlaskConical, labs: ['alt', 'ast', 'alp', 'ggt', 'bilirubin', 'directBili', 'albumin', 'totalProtein'] },
  cardiac: { name: 'Cardiac', icon: Heart, labs: ['troponin', 'bnp', 'ntProBnp', 'ck', 'ckMb', 'ldh'] },
  inflammatory: { name: 'Inflammatory', icon: AlertTriangle, labs: ['crp', 'esr', 'procalcitonin', 'ferritin'] },
  metabolic: { name: 'Metabolic', icon: Activity, labs: ['glucose', 'hba1c', 'lactate', 'ammonia', 'uricAcid'] },
  thyroid: { name: 'Thyroid', icon: Activity, labs: ['tsh', 'freeT4', 'freeT3'] },
  abg: { name: 'ABG', icon: Activity, labs: ['ph', 'pco2', 'po2', 'hco3', 'baseExcess'] },
};

// Get status based on value and reference
const getLabStatus = (key, value) => {
  const ref = LAB_REFERENCES[key];
  if (!ref || value === null || value === undefined) return 'unknown';
  
  const num = parseFloat(value);
  if (isNaN(num)) return 'unknown';
  
  if (ref.critical_low && num < ref.critical_low) return 'critical-low';
  if (ref.critical_high && num > ref.critical_high) return 'critical-high';
  if (num < ref.low) return 'low';
  if (num > ref.high) return 'high';
  return 'normal';
};

// Status colors
const STATUS_STYLES = {
  'normal': 'text-emerald-600 dark:text-emerald-400',
  'low': 'text-blue-600 dark:text-blue-400',
  'high': 'text-amber-600 dark:text-amber-400',
  'critical-low': 'text-rose-600 dark:text-rose-400 font-semibold',
  'critical-high': 'text-rose-600 dark:text-rose-400 font-semibold',
  'unknown': 'text-gray-500 dark:text-gray-400',
};

const STATUS_BG = {
  'normal': 'bg-emerald-50 dark:bg-emerald-900/20',
  'low': 'bg-blue-50 dark:bg-blue-900/20',
  'high': 'bg-amber-50 dark:bg-amber-900/20',
  'critical-low': 'bg-rose-50 dark:bg-rose-900/20',
  'critical-high': 'bg-rose-50 dark:bg-rose-900/20',
  'unknown': 'bg-gray-50 dark:bg-gray-800/50',
};

// Single lab value display
export function LabValue({ labKey, value, previousValue, timestamp, showReference = true, compact = false }) {
  const ref = LAB_REFERENCES[labKey];
  const status = getLabStatus(labKey, value);
  const isCritical = status.includes('critical');
  
  // Calculate delta if previous value exists
  const delta = previousValue !== undefined ? parseFloat(value) - parseFloat(previousValue) : null;
  
  if (!ref) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">{labKey}:</span>
        <span className="font-medium">{value}</span>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${STATUS_BG[status]}`}>
        {isCritical && <AlertTriangle className="w-3 h-3 text-rose-500" />}
        <span className="text-xs text-gray-600 dark:text-gray-400">{ref.name}:</span>
        <span className={`text-sm font-medium ${STATUS_STYLES[status]}`}>{value}</span>
        {ref.unit && <span className="text-xs text-gray-400">{ref.unit}</span>}
      </div>
    );
  }
  
  return (
    <div className={`p-3 rounded-lg ${STATUS_BG[status]} ${isCritical ? 'ring-1 ring-rose-300 dark:ring-rose-700' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isCritical && <AlertTriangle className="w-4 h-4 text-rose-500" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{ref.name}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl font-semibold ${STATUS_STYLES[status]}`}>{value}</span>
            {ref.unit && <span className="text-sm text-gray-500">{ref.unit}</span>}
          </div>
        </div>
        
        {delta !== null && delta !== 0 && (
          <div className={`flex items-center gap-1 ${delta > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
            {delta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm">{delta > 0 ? '+' : ''}{delta.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      {showReference && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ref: {ref.low} - {ref.high} {ref.unit}
        </div>
      )}
      
      {timestamp && (
        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// Lab category section
export function LabCategory({ category, labs, expanded: initialExpanded = true, onLabClick }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const catConfig = LAB_CATEGORIES[category];
  
  if (!catConfig) return null;
  
  const Icon = catConfig.icon;
  const hasAbnormal = labs.some(lab => {
    const status = getLabStatus(lab.key, lab.value);
    return status !== 'normal' && status !== 'unknown';
  });
  const hasCritical = labs.some(lab => getLabStatus(lab.key, lab.value).includes('critical'));
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${hasCritical ? 'border-l-4 border-l-rose-500' : hasAbnormal ? 'border-l-4 border-l-amber-500' : ''}`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${hasCritical ? 'text-rose-500' : hasAbnormal ? 'text-amber-500' : 'text-gray-400'}`} />
          <span className="font-medium text-gray-900 dark:text-gray-100">{catConfig.name}</span>
          {hasCritical && <Badge variant="danger" size="sm">Critical</Badge>}
          {!hasCritical && hasAbnormal && <Badge variant="warning" size="sm">Abnormal</Badge>}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      
      {expanded && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {labs.map((lab, idx) => (
            <div key={idx} onClick={() => onLabClick?.(lab)} className={onLabClick ? 'cursor-pointer' : ''}>
              <LabValue
                labKey={lab.key}
                value={lab.value}
                previousValue={lab.previousValue}
                timestamp={lab.timestamp}
                showReference={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Full lab panel display
export function LabPanel({ labs = [], previousLabs = [], groupByCategory = true, onLabClick }) {
  // Create lookup for previous values
  const previousMap = useMemo(() => {
    const map = {};
    previousLabs.forEach(lab => {
      map[lab.key] = lab.value;
    });
    return map;
  }, [previousLabs]);
  
  // Add previous values to current labs
  const enrichedLabs = useMemo(() => {
    return labs.map(lab => ({
      ...lab,
      previousValue: previousMap[lab.key],
    }));
  }, [labs, previousMap]);
  
  // Group by category
  const grouped = useMemo(() => {
    if (!groupByCategory) return null;
    
    const groups = {};
    Object.entries(LAB_CATEGORIES).forEach(([key, config]) => {
      groups[key] = [];
    });
    
    enrichedLabs.forEach(lab => {
      for (const [catKey, catConfig] of Object.entries(LAB_CATEGORIES)) {
        if (catConfig.labs.includes(lab.key)) {
          groups[catKey].push(lab);
          break;
        }
      }
    });
    
    // Remove empty categories
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) delete groups[key];
    });
    
    return groups;
  }, [enrichedLabs, groupByCategory]);
  
  // Summary stats
  const summary = useMemo(() => {
    let normal = 0, abnormal = 0, critical = 0;
    enrichedLabs.forEach(lab => {
      const status = getLabStatus(lab.key, lab.value);
      if (status === 'normal') normal++;
      else if (status.includes('critical')) critical++;
      else if (status !== 'unknown') abnormal++;
    });
    return { normal, abnormal, critical, total: enrichedLabs.length };
  }, [enrichedLabs]);
  
  if (labs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No lab results available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-sm text-gray-600 dark:text-gray-400">{summary.total} results:</span>
        {summary.critical > 0 && (
          <Badge variant="danger">{summary.critical} Critical</Badge>
        )}
        {summary.abnormal > 0 && (
          <Badge variant="warning">{summary.abnormal} Abnormal</Badge>
        )}
        {summary.normal > 0 && (
          <Badge variant="success">{summary.normal} Normal</Badge>
        )}
      </div>
      
      {/* Grouped display */}
      {groupByCategory && grouped ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([catKey, catLabs]) => (
            <LabCategory
              key={catKey}
              category={catKey}
              labs={catLabs}
              expanded={catLabs.some(l => getLabStatus(l.key, l.value).includes('critical'))}
              onLabClick={onLabClick}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {enrichedLabs.map((lab, idx) => (
            <div key={idx} onClick={() => onLabClick?.(lab)} className={onLabClick ? 'cursor-pointer' : ''}>
              <LabValue
                labKey={lab.key}
                value={lab.value}
                previousValue={lab.previousValue}
                timestamp={lab.timestamp}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact inline lab display
export function LabInline({ labs = [], maxDisplay = 5 }) {
  const displayed = labs.slice(0, maxDisplay);
  const remaining = labs.length - maxDisplay;
  
  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((lab, idx) => (
        <LabValue key={idx} labKey={lab.key} value={lab.value} compact />
      ))}
      {remaining > 0 && (
        <span className="text-sm text-gray-500 px-2 py-1">+{remaining} more</span>
      )}
    </div>
  );
}

export { LAB_REFERENCES, LAB_CATEGORIES, getLabStatus };
