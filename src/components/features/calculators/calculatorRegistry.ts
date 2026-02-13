export interface CalculatorMeta {
  id: string
  name: string
  shortName: string
  description: string
  category: 'vitals' | 'cardiac' | 'respiratory' | 'renal' | 'neuro' | 'metabolic'
  icon: string
  color: string
}

export const CALCULATORS: CalculatorMeta[] = [
  {
    id: 'map',
    name: 'Mean Arterial Pressure',
    shortName: 'MAP',
    description: 'Calculate MAP from systolic and diastolic BP',
    category: 'vitals',
    icon: 'Heart',
    color: 'text-red-400',
  },
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale',
    shortName: 'GCS',
    description: 'Assess level of consciousness (E/V/M)',
    category: 'neuro',
    icon: 'Brain',
    color: 'text-purple-400',
  },
  {
    id: 'news2',
    name: 'NEWS2 Score',
    shortName: 'NEWS2',
    description: '7-parameter clinical deterioration score',
    category: 'vitals',
    icon: 'AlertCircle',
    color: 'text-orange-400',
  },
  {
    id: 'curb65',
    name: 'CURB-65 Score',
    shortName: 'CURB-65',
    description: 'CAP risk stratification with mortality rates',
    category: 'respiratory',
    icon: 'Zap',
    color: 'text-yellow-400',
  },
  {
    id: 'calcium',
    name: 'Corrected Serum Calcium',
    shortName: 'Ca²⁺ Corrected',
    description: 'Adjust total calcium for albumin (Payne formula)',
    category: 'metabolic',
    icon: 'Droplet',
    color: 'text-cyan-400',
  },
  {
    id: 'qtc',
    name: 'Corrected QT Interval',
    shortName: 'QTc',
    description: 'Calculate QTc using Bazett formula',
    category: 'cardiac',
    icon: 'Activity',
    color: 'text-pink-400',
  },
  {
    id: 'cha2ds2vasc',
    name: 'CHA₂DS₂-VASc Score',
    shortName: 'CHA₂DS₂-VASc',
    description: 'AF stroke risk and anticoagulation guidance',
    category: 'cardiac',
    icon: 'Heart',
    color: 'text-red-400',
  },
  {
    id: 'wells',
    name: 'Wells Score',
    shortName: 'Wells',
    description: 'PE probability and diagnostic approach',
    category: 'respiratory',
    icon: 'Wind',
    color: 'text-blue-400',
  },
  {
    id: 'aniongap',
    name: 'Anion Gap Calculator',
    shortName: 'AG',
    description: 'Electrolyte gap and corrected AG with MUDPILES',
    category: 'metabolic',
    icon: 'Beaker',
    color: 'text-emerald-400',
  },
]

// Helper function to get calculator metadata by ID
export function getCalculatorById(id: string): CalculatorMeta | undefined {
  return CALCULATORS.find((calc) => calc.id === id)
}

// Helper function to get calculators by category
export function getCalculatorsByCategory(category: CalculatorMeta['category']): CalculatorMeta[] {
  return CALCULATORS.filter((calc) => calc.category === category)
}

// Category metadata for grouping
export const CALCULATOR_CATEGORIES = {
  vitals: { name: 'Vital Signs', description: 'Blood pressure, heart rate, respiratory rate' },
  cardiac: { name: 'Cardiac', description: 'Arrhythmia and heart disease risk' },
  respiratory: { name: 'Respiratory', description: 'Lung disease and PE risk' },
  renal: { name: 'Renal', description: 'Kidney function and electrolytes' },
  neuro: { name: 'Neurology', description: 'Consciousness and neurological assessment' },
  metabolic: { name: 'Metabolic', description: 'Electrolytes, pH, and metabolic acids' },
}
