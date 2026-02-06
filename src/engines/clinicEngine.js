// Clinic Engine — Structured note building with templates

export const TEMPLATES = {
  'chest-pain': {
    name: 'Chest Pain',
    hpi: [
      'Substernal chest pain',
      'Radiates to left arm',
      'Exertional in nature',
      'Relieved by rest/nitroglycerin',
      'Associated with diaphoresis',
      'Sudden onset',
      'Pleuritic quality',
    ],
    ros: [
      'Denies shortness of breath',
      'Denies nausea/vomiting',
      'Denies palpitations',
      'Denies syncope',
      'Denies leg swelling',
    ],
    exam: [
      'Regular rate and rhythm, no murmurs',
      'Lungs clear bilaterally',
      'No peripheral edema',
      'No JVD',
      'Normal capillary refill',
    ],
    assessment: [
      'Acute coronary syndrome — rule out',
      'Chest pain of unclear etiology',
      'Hypertension',
      'NSTEMI',
      'Unstable angina',
    ],
    plan: [
      'ECG performed',
      'Serial troponins ordered',
      'Aspirin 325 mg given',
      'Monitor on telemetry',
      'Cardiology consult',
      'Chest X-ray ordered',
    ],
  },
  dyspnea: {
    name: 'Dyspnea',
    hpi: [
      'Acute shortness of breath',
      'Onset over last 2 hours',
      'Associated with chest discomfort',
      'Worsened with exertion',
      'Orthopnea',
      'PND present',
    ],
    ros: [
      'Denies fever/chills',
      'Denies leg pain or swelling',
      'Denies cough',
      'Denies hemoptysis',
    ],
    exam: [
      'Tachypnea, tachycardia',
      'Lungs clear to auscultation',
      'Bilateral crackles',
      'No calf tenderness/swelling',
      'O2 sat on room air',
    ],
    assessment: [
      'SOB — etiology unclear',
      'DDx includes PE, pneumonia, cardiac cause',
      'Acute heart failure exacerbation',
      'COPD exacerbation',
    ],
    plan: [
      'Chest X-ray ordered',
      'D-dimer sent',
      'ECG performed',
      'Oxygen supplementation',
      'IV access established',
      'ABG ordered',
    ],
  },
  'abdominal-pain': {
    name: 'Abdominal Pain',
    hpi: [
      'Acute abdominal pain',
      'Periumbilical, migrated to RLQ',
      'Epigastric pain',
      'Colicky in nature',
      'Associated nausea/vomiting',
      'Anorexia',
      'No bowel movement for 3 days',
    ],
    ros: [
      'Denies fever',
      'Denies urinary symptoms',
      'Denies vaginal bleeding',
      'Denies diarrhea',
    ],
    exam: [
      'Tenderness in RLQ',
      'Guarding present',
      'Rebound tenderness positive',
      'Bowel sounds present',
      'No distension',
      'Murphy sign negative',
    ],
    assessment: [
      'Acute appendicitis — rule out',
      'Acute cholecystitis',
      'Small bowel obstruction',
      'Gastroenteritis',
    ],
    plan: [
      'NPO',
      'IV fluids initiated',
      'CBC, CRP, lipase ordered',
      'CT abdomen/pelvis ordered',
      'Surgical consult',
      'Analgesia: paracetamol IV',
    ],
  },
  generic: {
    name: 'Generic Note',
    hpi: [],
    ros: [],
    exam: [],
    assessment: [],
    plan: [],
  },
};

export function renderClinicianNote(sections) {
  let note = '';
  const labels = {
    hpi: 'HPI',
    ros: 'ROS',
    exam: 'Physical Exam',
    assessment: 'Assessment',
    plan: 'Plan',
  };

  Object.entries(labels).forEach(([key, label]) => {
    const items = sections[key] || [];
    if (items.length > 0) {
      note += `${label}:\n${items.map((i) => `  - ${i}`).join('\n')}\n\n`;
    }
  });

  return note.trim();
}

export function renderPatientSummary(sections) {
  let note = 'VISIT SUMMARY\n\n';

  if (sections.hpi?.length) {
    note += `What we discussed:\n${sections.hpi.join('. ')}.\n\n`;
  }
  if (sections.exam?.length) {
    note += `What we found:\n${sections.exam.join('. ')}.\n\n`;
  }
  if (sections.plan?.length) {
    note += `What we're doing:\n${sections.plan.map((p) => `  - ${p}`).join('\n')}\n`;
  }

  return note.trim();
}
