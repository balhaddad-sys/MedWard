export interface ShorthandEntry {
  trigger: string
  term: string
  type: 'lab' | 'imaging' | 'med' | 'action' | 'template'
  detail?: string
  expansion?: string
}

export const MEDICAL_SHORTHAND: ShorthandEntry[] = [
  // Labs
  { trigger: 'cbc', term: 'CBC', type: 'lab', detail: 'Complete Blood Count' },
  { trigger: 'cmp', term: 'CMP', type: 'lab', detail: 'Comprehensive Metabolic' },
  { trigger: 'bmp', term: 'BMP', type: 'lab', detail: 'Basic Metabolic' },
  { trigger: 'cr', term: 'Creatinine', type: 'lab', detail: 'Renal Function' },
  { trigger: 'lfts', term: 'LFTs', type: 'lab', detail: 'Liver Function Tests' },
  { trigger: 'lac', term: 'Lactate', type: 'lab', detail: 'Sepsis Marker' },
  { trigger: 'vbg', term: 'VBG', type: 'lab', detail: 'Venous Blood Gas' },
  { trigger: 'abg', term: 'ABG', type: 'lab', detail: 'Arterial Blood Gas' },
  { trigger: 'trop', term: 'Troponin', type: 'lab', detail: 'Cardiac Marker' },
  { trigger: 'bnp', term: 'BNP', type: 'lab', detail: 'Heart Failure Marker' },
  { trigger: 'pt', term: 'PT/INR', type: 'lab', detail: 'Coagulation' },
  { trigger: 'ptt', term: 'PTT', type: 'lab', detail: 'Coagulation' },
  { trigger: 'ua', term: 'Urinalysis', type: 'lab', detail: 'Urine Studies' },
  { trigger: 'ucx', term: 'Urine Culture', type: 'lab', detail: 'Microbiology' },
  { trigger: 'bcx', term: 'Blood Cultures x2', type: 'lab', detail: 'Microbiology' },
  { trigger: 'tsh', term: 'TSH', type: 'lab', detail: 'Thyroid Function' },
  { trigger: 'hba1c', term: 'HbA1c', type: 'lab', detail: 'Glycemic Control' },
  { trigger: 'lip', term: 'Lipid Panel', type: 'lab', detail: 'Cholesterol' },
  // Imaging
  { trigger: 'cxr', term: 'CXR', type: 'imaging', detail: 'Chest X-Ray' },
  { trigger: 'kub', term: 'KUB', type: 'imaging', detail: 'Abdomen X-Ray' },
  { trigger: 'cthead', term: 'CT Head', type: 'imaging', detail: 'Non-contrast' },
  { trigger: 'ctap', term: 'CT A/P', type: 'imaging', detail: 'Abdomen/Pelvis' },
  { trigger: 'ctpa', term: 'CTPA', type: 'imaging', detail: 'PE Protocol' },
  { trigger: 'cta', term: 'CTA', type: 'imaging', detail: 'CT Angiography' },
  { trigger: 'mri', term: 'MRI', type: 'imaging', detail: 'Magnetic Resonance' },
  { trigger: 'us', term: 'Ultrasound', type: 'imaging', detail: 'Ultrasound' },
  { trigger: 'echo', term: 'Echocardiogram', type: 'imaging', detail: 'TTE' },
  { trigger: 'ekg', term: 'EKG', type: 'imaging', detail: '12-lead ECG' },
  // Medications (names only - no dosing for safety)
  { trigger: 'vanc', term: 'Vancomycin', type: 'med', detail: 'Gram+ coverage' },
  { trigger: 'zosyn', term: 'Piperacillin-Tazobactam', type: 'med', detail: 'Broad spectrum' },
  { trigger: 'ctx', term: 'Ceftriaxone', type: 'med', detail: 'Third-gen ceph' },
  { trigger: 'mero', term: 'Meropenem', type: 'med', detail: 'Carbapenem' },
  { trigger: 'flagyl', term: 'Metronidazole', type: 'med', detail: 'Anaerobic coverage' },
  { trigger: 'levo', term: 'Levofloxacin', type: 'med', detail: 'Fluoroquinolone' },
  { trigger: 'azithro', term: 'Azithromycin', type: 'med', detail: 'Macrolide' },
  { trigger: 'hep', term: 'Heparin', type: 'med', detail: 'Anticoagulation' },
  { trigger: 'enox', term: 'Enoxaparin', type: 'med', detail: 'LMWH' },
  { trigger: 'lasix', term: 'Furosemide', type: 'med', detail: 'Loop diuretic' },
  { trigger: 'tylenol', term: 'Acetaminophen', type: 'med', detail: 'Analgesic/Antipyretic' },
  { trigger: 'nsaid', term: 'NSAID', type: 'med', detail: 'Anti-inflammatory' },
  { trigger: 'ppi', term: 'PPI', type: 'med', detail: 'Proton pump inhibitor' },
  { trigger: 'insulin', term: 'Insulin', type: 'med', detail: 'Glycemic control' },
  { trigger: 'steroid', term: 'Corticosteroid', type: 'med', detail: 'Anti-inflammatory' },
  { trigger: 'nebs', term: 'Nebulizer treatments', type: 'med', detail: 'Respiratory' },
  // Actions
  { trigger: 'npo', term: 'NPO', type: 'action', detail: 'Nil By Mouth' },
  { trigger: 'ivf', term: 'IV Fluids', type: 'action', detail: 'Crystalloid' },
  { trigger: 'o2', term: 'Supplemental O2', type: 'action', detail: 'Oxygen therapy' },
  { trigger: 'tele', term: 'Telemetry', type: 'action', detail: 'Cardiac monitoring' },
  { trigger: 'fup', term: 'Follow-up', type: 'action', detail: 'Outpatient' },
  { trigger: 'dc', term: 'Discharge', type: 'action', detail: 'Plan for discharge' },
  { trigger: 'consult', term: 'Consult', type: 'action', detail: 'Specialty consult' },
  { trigger: 'admit', term: 'Admit', type: 'action', detail: 'Admission orders' },
  // Dot phrases (templates)
  {
    trigger: '.sepsis', term: 'Sepsis Bundle', type: 'template',
    expansion: `Sepsis Protocol:\n- Lactate obtained\n- Blood cultures x2 before antibiotics\n- Broad-spectrum antibiotics started\n- 30 mL/kg crystalloid if hypotensive/lactate >=4\n- Vasopressors if MAP <65 after fluids`,
  },
  {
    trigger: '.acs', term: 'ACS Protocol', type: 'template',
    expansion: `ACS Workup:\n- EKG obtained and interpreted\n- Serial troponins q3h x3\n- Aspirin given\n- Heparin started\n- Cardiology consulted`,
  },
  {
    trigger: '.dvtppx', term: 'DVT Prophylaxis', type: 'template',
    expansion: `DVT Prophylaxis:\n- Enoxaparin 40mg SQ daily OR\n- Heparin 5000 units SQ q8h\n- SCDs when not ambulating\n- Early ambulation encouraged`,
  },
]

export function getShorthandByTrigger(trigger: string): ShorthandEntry | undefined {
  return MEDICAL_SHORTHAND.find((s) => s.trigger.toLowerCase() === trigger.toLowerCase())
}

export function searchShorthand(queryText: string, limit = 5): ShorthandEntry[] {
  const q = queryText.toLowerCase()
  return MEDICAL_SHORTHAND
    .filter((s) =>
      s.trigger.startsWith(q) ||
      s.term.toLowerCase().startsWith(q) ||
      s.term.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      if (a.trigger === q) return -1
      if (b.trigger === q) return 1
      if (a.trigger.startsWith(q) && !b.trigger.startsWith(q)) return -1
      if (b.trigger.startsWith(q) && !a.trigger.startsWith(q)) return 1
      return a.term.localeCompare(b.term)
    })
    .slice(0, limit)
}
