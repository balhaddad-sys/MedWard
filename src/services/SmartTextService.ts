export interface SmartTextPhrase {
  id: string
  abbreviation: string
  title: string
  content: string
  category: string
  usageCount: number
  lastUsedAt?: Date
  createdBy: string
  isCustom: boolean
}

// Default phrase library
const DEFAULT_PHRASES: Omit<SmartTextPhrase, 'id' | 'usageCount' | 'createdBy' | 'isCustom'>[] = [
  {
    abbreviation: 'hpi',
    title: 'History of Present Illness',
    content:
      '[Patient name] is a [age]-year-old [gender] who presents with [chief complaint] for [duration]. The patient reports [associated symptoms]. [Pertinent positives]. Denies [pertinent negatives]. [Timeline of illness]. [Previous treatment/interventions].',
    category: 'History',
  },
  {
    abbreviation: 'ros',
    title: 'Review of Systems',
    content:
      'General: Denies fever, chills, weight changes, fatigue.\nHEENT: Denies headache, vision changes, hearing loss.\nCardiovascular: Denies chest pain, palpitations, orthopnea, PND, edema.\nRespiratory: Denies dyspnea, cough, hemoptysis, wheezing.\nGI: Denies nausea, vomiting, diarrhea, constipation, abdominal pain.\nGU: Denies dysuria, frequency, urgency, hematuria.\nMSK: Denies joint pain, swelling, stiffness.\nNeuro: Denies dizziness, numbness, tingling, weakness.\nPsych: Denies depression, anxiety, suicidal ideation.',
    category: 'History',
  },
  {
    abbreviation: 'pe',
    title: 'Physical Examination',
    content:
      'General: Alert and oriented, no acute distress.\nVitals: BP [  /  ], HR [  ], RR [  ], Temp [  ]C, SpO2 [  ]%\nHEENT: NCAT, PERRLA, EOMI, mucous membranes moist.\nNeck: Supple, no JVD, no lymphadenopathy.\nCardiac: RRR, no murmurs/rubs/gallops.\nLungs: CTAB, no wheezes/crackles/rhonchi.\nAbdomen: Soft, non-tender, non-distended, BS present.\nExtremities: No edema, no cyanosis, peripheral pulses intact.\nNeuro: CN II-XII intact, strength 5/5 bilateral, sensation intact.',
    category: 'Exam',
  },
  {
    abbreviation: 'ap',
    title: 'Assessment & Plan',
    content:
      'Assessment:\n[Primary diagnosis] - [supporting evidence]\n\nPlan:\n1. [Intervention/medication]\n2. [Monitoring/labs]\n3. [Consults]\n4. [Disposition/follow-up]\n\nDisposition: [Admit/Discharge/Transfer]\nCondition: [Stable/Guarded/Critical]',
    category: 'Plan',
  },
  {
    abbreviation: 'admit',
    title: 'Admission Note',
    content:
      'ADMISSION NOTE\n\nDate/Time: [  ]\nAttending: [  ]\nService: [  ]\n\nChief Complaint: [  ]\nHPI: [  ]\nPMH: [  ]\nMedications: [  ]\nAllergies: [  ]\nSocial Hx: [  ]\nFamily Hx: [  ]\nROS: [  ]\nPhysical Exam: [  ]\nLabs/Imaging: [  ]\n\nAssessment: [  ]\nPlan: [  ]\n\nCode Status: [  ]\nDVT Prophylaxis: [  ]',
    category: 'Notes',
  },
  {
    abbreviation: 'dc',
    title: 'Discharge Summary',
    content:
      'DISCHARGE SUMMARY\n\nAdmission Date: [  ]\nDischarge Date: [  ]\n\nAdmitting Diagnosis: [  ]\nDischarge Diagnosis: [  ]\n\nHospital Course: [  ]\n\nDischarge Medications:\n1. [  ]\n\nFollow-Up:\n- [Provider] in [timeframe]\n\nDischarge Instructions:\n- [  ]\n\nReturn Precautions:\n- Return to ED if [  ]',
    category: 'Notes',
  },
  {
    abbreviation: 'prog',
    title: 'Progress Note',
    content:
      'PROGRESS NOTE\n\nSubjective: Patient reports [  ]. Overnight events: [  ].\nObjective:\n  Vitals: [  ]\n  Exam: [  ]\n  Labs: [  ]\nAssessment: [  ] - [improving/stable/worsening]\nPlan:\n1. [  ]\n2. [  ]',
    category: 'Notes',
  },
  {
    abbreviation: 'pain',
    title: 'Pain Assessment',
    content:
      'Pain Assessment:\nLocation: [  ]\nOnset: [  ]\nCharacter: [sharp/dull/aching/burning/cramping]\nRadiation: [  ]\nSeverity: [  ]/10\nTiming: [constant/intermittent]\nExacerbating factors: [  ]\nRelieving factors: [  ]\nAssociated symptoms: [  ]',
    category: 'Assessment',
  },
  {
    abbreviation: 'neuro',
    title: 'Neurological Exam',
    content:
      'Neurological Examination:\nMental Status: Alert, oriented x [  ]. GCS: E[  ]V[  ]M[  ] = [  ]/15\nCranial Nerves: II-XII intact\nMotor: Upper [  ]/5 bilateral, Lower [  ]/5 bilateral\nSensory: Light touch intact, proprioception intact\nCerebellar: Finger-to-nose intact, heel-to-shin intact\nReflexes: 2+ symmetric\nBabinski: Downgoing bilateral\nGait: [  ]',
    category: 'Exam',
  },
  {
    abbreviation: 'consult',
    title: 'Consultation Request',
    content:
      'CONSULTATION REQUEST\n\nRequesting Service: [  ]\nConsulting Service: [  ]\nUrgency: [Routine/Urgent/Emergent]\n\nReason for Consult: [  ]\n\nBrief History: [  ]\nRelevant Labs/Imaging: [  ]\nCurrent Management: [  ]\n\nSpecific Question: [  ]',
    category: 'Notes',
  },
]

class SmartTextServiceImpl {
  private phrases: SmartTextPhrase[] = []
  private triggerPrefix = '.'

  async init(userId: string): Promise<void> {
    // Load default phrases
    this.phrases = DEFAULT_PHRASES.map((p, idx) => ({
      ...p,
      id: `default_${idx}`,
      usageCount: 0,
      createdBy: 'system',
      isCustom: false,
    }))

    // TODO: Load custom phrases from Firestore for this user
    // const userPhrases = await getUserPhrases(userId)
    // this.phrases = [...this.phrases, ...userPhrases]

    // Load usage counts from localStorage
    const saved = localStorage.getItem(`smarttext_usage_${userId}`)
    if (saved) {
      try {
        const usageCounts: Record<string, number> = JSON.parse(saved)
        this.phrases = this.phrases.map((p) => ({
          ...p,
          usageCount: usageCounts[p.abbreviation] || 0,
        }))
      } catch {
        // ignore
      }
    }
  }

  getTriggerPrefix(): string {
    return this.triggerPrefix
  }

  search(query: string): SmartTextPhrase[] {
    if (!query.startsWith(this.triggerPrefix)) return []

    const search = query.slice(this.triggerPrefix.length).toLowerCase()
    if (!search) {
      // Return top phrases by usage
      return [...this.phrases].sort((a, b) => b.usageCount - a.usageCount).slice(0, 10)
    }

    return this.phrases
      .filter(
        (p) =>
          p.abbreviation.toLowerCase().includes(search) ||
          p.title.toLowerCase().includes(search)
      )
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
  }

  getPhrase(abbreviation: string): SmartTextPhrase | undefined {
    return this.phrases.find((p) => p.abbreviation === abbreviation)
  }

  recordUsage(abbreviation: string, userId: string): void {
    const phrase = this.phrases.find((p) => p.abbreviation === abbreviation)
    if (phrase) {
      phrase.usageCount++
      phrase.lastUsedAt = new Date()
    }

    // Persist usage counts
    const usageCounts: Record<string, number> = {}
    this.phrases.forEach((p) => {
      usageCounts[p.abbreviation] = p.usageCount
    })
    localStorage.setItem(`smarttext_usage_${userId}`, JSON.stringify(usageCounts))
  }

  getTopPhrases(count: number = 3): SmartTextPhrase[] {
    return [...this.phrases].sort((a, b) => b.usageCount - a.usageCount).slice(0, count)
  }

  getAllPhrases(): SmartTextPhrase[] {
    return [...this.phrases]
  }

  getCategories(): string[] {
    return [...new Set(this.phrases.map((p) => p.category))].sort()
  }

  async addCustomPhrase(
    phrase: Omit<SmartTextPhrase, 'id' | 'usageCount' | 'isCustom'>,
    userId: string
  ): Promise<SmartTextPhrase> {
    // Check for collision
    if (this.phrases.some((p) => p.abbreviation === phrase.abbreviation)) {
      throw new Error(`Abbreviation "${phrase.abbreviation}" already exists`)
    }

    const newPhrase: SmartTextPhrase = {
      ...phrase,
      id: `custom_${Date.now()}`,
      usageCount: 0,
      isCustom: true,
    }

    this.phrases.push(newPhrase)

    // TODO: Save to Firestore
    // await saveUserPhrase(userId, newPhrase)

    return newPhrase
  }

  async removeCustomPhrase(id: string): Promise<void> {
    this.phrases = this.phrases.filter((p) => p.id !== id || !p.isCustom)
    // TODO: Remove from Firestore
  }
}

export const smartTextService = new SmartTextServiceImpl()
