/**
 * Common On-Call Drugs Configuration
 * Organized by category with routes and common dosages
 */

export interface DrugInfo {
  name: string
  category:
    | 'analgesia'
    | 'antiemetic'
    | 'antibiotic'
    | 'anticoagulant'
    | 'electrolyte'
    | 'sedation'
    | 'cardiac'
    | 'respiratory'
    | 'GI'
    | 'other'
  route: string
  commonDose?: string
}

export const COMMON_DRUGS: DrugInfo[] = [
  // ANALGESIA
  {
    name: 'Paracetamol',
    category: 'analgesia',
    route: 'IV/PO',
    commonDose: '500mg-1g Q6H',
  },
  {
    name: 'Ibuprofen',
    category: 'analgesia',
    route: 'PO',
    commonDose: '400-800mg Q6-8H',
  },
  {
    name: 'Diclofenac',
    category: 'analgesia',
    route: 'IV/IM/PO',
    commonDose: '50mg Q8H',
  },
  {
    name: 'Codeine',
    category: 'analgesia',
    route: 'PO',
    commonDose: '15-30mg Q4-6H',
  },
  {
    name: 'Morphine',
    category: 'analgesia',
    route: 'IV/IM/PO',
    commonDose: '2-10mg IV Q2-4H',
  },
  {
    name: 'Tramadol',
    category: 'analgesia',
    route: 'IV/PO',
    commonDose: '50-100mg Q4-6H',
  },
  {
    name: 'Oxycodone',
    category: 'analgesia',
    route: 'PO',
    commonDose: '5-10mg Q4-6H',
  },

  // ANTIEMETICS
  {
    name: 'Ondansetron',
    category: 'antiemetic',
    route: 'IV/PO',
    commonDose: '4mg Q8H',
  },
  {
    name: 'Metoclopramide',
    category: 'antiemetic',
    route: 'IV/PO',
    commonDose: '10mg Q6-8H',
  },
  {
    name: 'Cyclizine',
    category: 'antiemetic',
    route: 'IV/IM/PO',
    commonDose: '50mg Q6-8H',
  },
  {
    name: 'Prochlorperazine',
    category: 'antiemetic',
    route: 'IV/IM/PO',
    commonDose: '12.5mg IM Q6H',
  },

  // ANTIBIOTICS
  {
    name: 'Amoxicillin',
    category: 'antibiotic',
    route: 'PO',
    commonDose: '500mg TDS',
  },
  {
    name: 'Co-amoxiclav',
    category: 'antibiotic',
    route: 'IV/PO',
    commonDose: '1.2g IV Q8H',
  },
  {
    name: 'Clarithromycin',
    category: 'antibiotic',
    route: 'IV/PO',
    commonDose: '500mg BD',
  },
  {
    name: 'Doxycycline',
    category: 'antibiotic',
    route: 'PO',
    commonDose: '100mg BD',
  },
  {
    name: 'Flucloxacillin',
    category: 'antibiotic',
    route: 'IV/PO',
    commonDose: '500mg Q6H',
  },
  {
    name: 'Piperacillin-Tazobactam',
    category: 'antibiotic',
    route: 'IV',
    commonDose: '4.5g Q6-8H',
  },
  {
    name: 'Meropenem',
    category: 'antibiotic',
    route: 'IV',
    commonDose: '1g Q8H',
  },
  {
    name: 'Gentamicin',
    category: 'antibiotic',
    route: 'IV/IM',
    commonDose: '7mg/kg OD',
  },
  {
    name: 'Vancomycin',
    category: 'antibiotic',
    route: 'IV',
    commonDose: '15-20mg/kg Q8-12H',
  },
  {
    name: 'Metronidazole',
    category: 'antibiotic',
    route: 'IV/PO',
    commonDose: '500mg Q8H',
  },
  {
    name: 'Ciprofloxacin',
    category: 'antibiotic',
    route: 'IV/PO',
    commonDose: '500-750mg BD',
  },
  {
    name: 'Trimethoprim',
    category: 'antibiotic',
    route: 'PO',
    commonDose: '200mg BD',
  },
  {
    name: 'Nitrofurantoin',
    category: 'antibiotic',
    route: 'PO',
    commonDose: '100mg BD',
  },
  {
    name: 'Ceftriaxone',
    category: 'antibiotic',
    route: 'IV/IM',
    commonDose: '1-2g Q12H',
  },
  {
    name: 'Benzylpenicillin',
    category: 'antibiotic',
    route: 'IV',
    commonDose: '1.2g Q6H',
  },

  // ANTICOAGULANTS
  {
    name: 'Enoxaparin',
    category: 'anticoagulant',
    route: 'SC',
    commonDose: '40mg OD',
  },
  {
    name: 'Dalteparin',
    category: 'anticoagulant',
    route: 'SC',
    commonDose: '5000IU OD',
  },
  {
    name: 'Heparin',
    category: 'anticoagulant',
    route: 'IV',
    commonDose: '80IU/kg bolus, then 18IU/kg/hr',
  },
  {
    name: 'Warfarin',
    category: 'anticoagulant',
    route: 'PO',
    commonDose: 'INR target 2-3',
  },
  {
    name: 'Apixaban',
    category: 'anticoagulant',
    route: 'PO',
    commonDose: '5mg BD',
  },
  {
    name: 'Rivaroxaban',
    category: 'anticoagulant',
    route: 'PO',
    commonDose: '20mg OD',
  },
  {
    name: 'Edoxaban',
    category: 'anticoagulant',
    route: 'PO',
    commonDose: '60mg OD',
  },

  // ELECTROLYTES
  {
    name: 'Potassium Chloride',
    category: 'electrolyte',
    route: 'IV',
    commonDose: '20mmol over 4-6hrs',
  },
  {
    name: 'Sodium Chloride 0.9%',
    category: 'electrolyte',
    route: 'IV',
    commonDose: '500-1000ml bolus',
  },
  {
    name: 'Calcium Gluconate',
    category: 'electrolyte',
    route: 'IV',
    commonDose: '10ml 10% over 2-5mins',
  },
  {
    name: 'Magnesium Sulphate',
    category: 'electrolyte',
    route: 'IV',
    commonDose: '2g over 5-20mins',
  },
  {
    name: 'Phosphate (Sandoz)',
    category: 'electrolyte',
    route: 'IV',
    commonDose: '9-18mmol over 6hrs',
  },

  // SEDATION
  {
    name: 'Lorazepam',
    category: 'sedation',
    route: 'IV/PO',
    commonDose: '0.5-2mg Q4-6H',
  },
  {
    name: 'Diazepam',
    category: 'sedation',
    route: 'IV/PO',
    commonDose: '2-10mg Q4-6H',
  },
  {
    name: 'Midazolam',
    category: 'sedation',
    route: 'IV',
    commonDose: '0.5-2mg Q5-10mins',
  },
  {
    name: 'Haloperidol',
    category: 'sedation',
    route: 'IV/IM/PO',
    commonDose: '0.5-10mg Q4-6H',
  },
  {
    name: 'Chlorpromazine',
    category: 'sedation',
    route: 'IV/IM/PO',
    commonDose: '12.5-50mg Q4-6H',
  },

  // CARDIAC
  {
    name: 'Amlodipine',
    category: 'cardiac',
    route: 'PO',
    commonDose: '5-10mg OD',
  },
  {
    name: 'Bisoprolol',
    category: 'cardiac',
    route: 'PO',
    commonDose: '1.25-10mg OD',
  },
  {
    name: 'Ramipril',
    category: 'cardiac',
    route: 'PO',
    commonDose: '1.25-10mg OD',
  },
  {
    name: 'Furosemide',
    category: 'cardiac',
    route: 'IV/PO',
    commonDose: '40-120mg OD',
  },
  {
    name: 'Spironolactone',
    category: 'cardiac',
    route: 'PO',
    commonDose: '12.5-50mg OD',
  },
  {
    name: 'Glyceryl Trinitrate (GTN)',
    category: 'cardiac',
    route: 'SL/IV',
    commonDose: '0.3-0.6mg SL PRN',
  },
  {
    name: 'Amiodarone',
    category: 'cardiac',
    route: 'IV/PO',
    commonDose: '300mg IV bolus',
  },
  {
    name: 'Adenosine',
    category: 'cardiac',
    route: 'IV',
    commonDose: '6mg, then 12mg',
  },
  {
    name: 'Atropine',
    category: 'cardiac',
    route: 'IV',
    commonDose: '0.3-0.6mg Q3-5mins',
  },
  {
    name: 'Metoprolol',
    category: 'cardiac',
    route: 'IV/PO',
    commonDose: '1-5mg IV Q3-5mins',
  },

  // RESPIRATORY
  {
    name: 'Salbutamol',
    category: 'respiratory',
    route: 'Inhaled/Neb',
    commonDose: '100mcg Q4-6H',
  },
  {
    name: 'Ipratropium',
    category: 'respiratory',
    route: 'Neb',
    commonDose: '250-500mcg Q6-8H',
  },
  {
    name: 'Prednisolone',
    category: 'respiratory',
    route: 'PO',
    commonDose: '30-50mg OD',
  },
  {
    name: 'Hydrocortisone',
    category: 'respiratory',
    route: 'IV',
    commonDose: '50-100mg Q6H',
  },
  {
    name: 'Aminophylline',
    category: 'respiratory',
    route: 'IV',
    commonDose: '5-6mg/kg loading',
  },

  // GI
  {
    name: 'Omeprazole',
    category: 'GI',
    route: 'IV/PO',
    commonDose: '20-40mg OD',
  },
  {
    name: 'Lansoprazole',
    category: 'GI',
    route: 'PO',
    commonDose: '15-30mg OD',
  },
  {
    name: 'Ranitidine',
    category: 'GI',
    route: 'IV/PO',
    commonDose: '150mg BD',
  },
  {
    name: 'Loperamide',
    category: 'GI',
    route: 'PO',
    commonDose: '2mg Q4-6H',
  },
  {
    name: 'Senna',
    category: 'GI',
    route: 'PO',
    commonDose: '7.5-15mg OD',
  },
  {
    name: 'Lactulose',
    category: 'GI',
    route: 'PO',
    commonDose: '15-30ml BD',
  },
  {
    name: 'Movicol',
    category: 'GI',
    route: 'PO',
    commonDose: '1-3 sachets daily',
  },

  // OTHER
  {
    name: 'Insulin (Actrapid)',
    category: 'other',
    route: 'IV/SC',
    commonDose: '0.1IU/kg/hr IV',
  },
  {
    name: 'Dextrose 50%',
    category: 'other',
    route: 'IV',
    commonDose: '25-50ml IV',
  },
  {
    name: 'Glucagon',
    category: 'other',
    route: 'IV/SC/IM',
    commonDose: '1mg',
  },
  {
    name: 'Naloxone',
    category: 'other',
    route: 'IV/IM',
    commonDose: '0.4-0.8mg Q2-3mins',
  },
  {
    name: 'Flumazenil',
    category: 'other',
    route: 'IV',
    commonDose: '0.2mg, then 0.1mg Q1min',
  },
  {
    name: 'Adrenaline (Epinephrine)',
    category: 'other',
    route: 'IV/IM',
    commonDose: '1mg IV Q3-5mins (cardiac arrest)',
  },
]
