/**
 * Common PMH (Past Medical History) Conditions
 * Used for autocomplete in clerking forms
 */

export interface PMHCondition {
  name: string
  abbreviation?: string
  category:
    | 'cardiac'
    | 'respiratory'
    | 'metabolic'
    | 'renal'
    | 'neurological'
    | 'GI'
    | 'musculoskeletal'
    | 'haematological'
    | 'psychiatric'
    | 'other'
}

export const PMH_CONDITIONS: PMHCondition[] = [
  // CARDIAC
  { name: 'Hypertension', abbreviation: 'HTN', category: 'cardiac' },
  {
    name: 'Ischaemic Heart Disease',
    abbreviation: 'IHD',
    category: 'cardiac',
  },
  {
    name: 'Myocardial Infarction',
    abbreviation: 'MI',
    category: 'cardiac',
  },
  { name: 'Atrial Fibrillation', abbreviation: 'AF', category: 'cardiac' },
  {
    name: 'Heart Failure',
    abbreviation: 'HF',
    category: 'cardiac',
  },
  {
    name: 'Valvular Heart Disease',
    abbreviation: 'VHD',
    category: 'cardiac',
  },
  {
    name: 'Cardiomyopathy',
    abbreviation: 'CMP',
    category: 'cardiac',
  },
  { name: 'Pericarditis', category: 'cardiac' },
  { name: 'Endocarditis', category: 'cardiac' },
  { name: 'Aortic Aneurysm', category: 'cardiac' },

  // RESPIRATORY
  { name: 'Asthma', category: 'respiratory' },
  {
    name: 'Chronic Obstructive Pulmonary Disease',
    abbreviation: 'COPD',
    category: 'respiratory',
  },
  {
    name: 'Bronchiectasis',
    abbreviation: 'BE',
    category: 'respiratory',
  },
  {
    name: 'Pulmonary Fibrosis',
    abbreviation: 'IPF',
    category: 'respiratory',
  },
  {
    name: 'Obstructive Sleep Apnoea',
    abbreviation: 'OSA',
    category: 'respiratory',
  },
  {
    name: 'Pulmonary Embolism',
    abbreviation: 'PE',
    category: 'respiratory',
  },
  { name: 'Pleural Effusion', category: 'respiratory' },
  { name: 'Pneumothorax', category: 'respiratory' },

  // METABOLIC
  {
    name: 'Type 1 Diabetes Mellitus',
    abbreviation: 'T1DM',
    category: 'metabolic',
  },
  {
    name: 'Type 2 Diabetes Mellitus',
    abbreviation: 'T2DM',
    category: 'metabolic',
  },
  { name: 'Hypothyroidism', category: 'metabolic' },
  { name: 'Hyperthyroidism', category: 'metabolic' },
  { name: 'Gout', category: 'metabolic' },
  {
    name: 'Dyslipidaemia',
    abbreviation: 'lipid disorder',
    category: 'metabolic',
  },
  { name: 'Obesity', category: 'metabolic' },

  // RENAL
  {
    name: 'Chronic Kidney Disease',
    abbreviation: 'CKD',
    category: 'renal',
  },
  {
    name: 'End-Stage Renal Failure on Dialysis',
    abbreviation: 'ESRF',
    category: 'renal',
  },
  {
    name: 'Nephrotic Syndrome',
    abbreviation: 'NS',
    category: 'renal',
  },
  { name: 'Renal Transplant', category: 'renal' },
  { name: 'Glomerulonephritis', category: 'renal' },

  // NEUROLOGICAL
  { name: 'Epilepsy', category: 'neurological' },
  { name: 'Stroke', abbreviation: 'CVA', category: 'neurological' },
  { name: 'Transient Ischaemic Attack', abbreviation: 'TIA', category: 'neurological' },
  { name: "Parkinson's Disease", category: 'neurological' },
  { name: 'Dementia', category: 'neurological' },
  {
    name: 'Multiple Sclerosis',
    abbreviation: 'MS',
    category: 'neurological',
  },
  { name: 'Migraine', category: 'neurological' },
  { name: 'Motor Neurone Disease', abbreviation: 'MND', category: 'neurological' },
  { name: 'Spinal Cord Injury', category: 'neurological' },

  // GI
  {
    name: 'Gastro-Oesophageal Reflux Disease',
    abbreviation: 'GORD',
    category: 'GI',
  },
  {
    name: 'Inflammatory Bowel Disease - Crohn\'s',
    abbreviation: 'IBD (Crohn\'s)',
    category: 'GI',
  },
  {
    name: 'Inflammatory Bowel Disease - Ulcerative Colitis',
    abbreviation: 'IBD (UC)',
    category: 'GI',
  },
  { name: 'Cirrhosis', category: 'GI' },
  { name: 'Hepatitis B', category: 'GI' },
  { name: 'Hepatitis C', category: 'GI' },
  { name: 'Coeliac Disease', category: 'GI' },
  { name: 'Peptic Ulcer Disease', abbreviation: 'PUD', category: 'GI' },
  { name: 'Diverticular Disease', category: 'GI' },
  { name: 'Irritable Bowel Syndrome', abbreviation: 'IBS', category: 'GI' },

  // MUSCULOSKELETAL
  {
    name: 'Osteoarthritis',
    abbreviation: 'OA',
    category: 'musculoskeletal',
  },
  {
    name: 'Rheumatoid Arthritis',
    abbreviation: 'RA',
    category: 'musculoskeletal',
  },
  {
    name: 'Osteoporosis',
    abbreviation: 'OP',
    category: 'musculoskeletal',
  },
  {
    name: 'Ankylosing Spondylitis',
    abbreviation: 'AS',
    category: 'musculoskeletal',
  },
  { name: 'Systemic Lupus Erythematosus', abbreviation: 'SLE', category: 'musculoskeletal' },
  { name: 'Sjogren Syndrome', category: 'musculoskeletal' },

  // HAEMATOLOGICAL
  { name: 'Anaemia', category: 'haematological' },
  {
    name: 'Deep Vein Thrombosis',
    abbreviation: 'DVT',
    category: 'haematological',
  },
  {
    name: 'Sickle Cell Disease',
    abbreviation: 'SCD',
    category: 'haematological',
  },
  { name: 'Thalassaemia', category: 'haematological' },
  {
    name: 'Immune Thrombocytopenia',
    abbreviation: 'ITP',
    category: 'haematological',
  },
  { name: 'Lymphoma', category: 'haematological' },
  { name: 'Leukaemia', category: 'haematological' },
  {
    name: 'Thrombophilia',
    category: 'haematological',
  },
  { name: 'Polycythaemia Vera', category: 'haematological' },

  // PSYCHIATRIC
  { name: 'Depression', category: 'psychiatric' },
  { name: 'Anxiety Disorder', category: 'psychiatric' },
  { name: 'Bipolar Disorder', category: 'psychiatric' },
  { name: 'Schizophrenia', category: 'psychiatric' },
  {
    name: 'Post-Traumatic Stress Disorder',
    abbreviation: 'PTSD',
    category: 'psychiatric',
  },
  { name: 'Obsessive-Compulsive Disorder', abbreviation: 'OCD', category: 'psychiatric' },
  { name: 'Panic Disorder', category: 'psychiatric' },
  { name: 'Substance Use Disorder', category: 'psychiatric' },

  // OTHER
  { name: 'Human Immunodeficiency Virus', abbreviation: 'HIV', category: 'other' },
  { name: 'Transplant Recipient', category: 'other' },
  { name: 'Malignancy', category: 'other' },
  { name: 'Tuberculosis', abbreviation: 'TB', category: 'other' },
  { name: 'Immunosuppression', category: 'other' },
]
