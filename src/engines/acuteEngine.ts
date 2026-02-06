export function parseNumericInput(value: string | number | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num)) return null
  return num
}

export function validateBP(systolic: string | number, diastolic: string | number) {
  const sys = parseNumericInput(systolic)
  const dia = parseNumericInput(diastolic)
  if (sys === null || dia === null) return { valid: false as const, error: 'Enter SBP and DBP' }
  if (sys < 0 || dia < 0) return { valid: false as const, error: 'Values cannot be negative' }
  if (dia >= sys) return { valid: false as const, error: 'DBP must be less than SBP' }
  if (sys > 300 || dia > 200) return { valid: false as const, error: 'Check BP values' }
  return { valid: true as const, sys, dia }
}

export interface MAPResult {
  value: number | null
  display: string
  target?: number
  meetsTarget?: boolean
  status: 'adequate' | 'low' | 'invalid'
  interpretation?: string
  error?: string
}

export function calculateMAP(systolic: string | number, diastolic: string | number, target = 65): MAPResult {
  const validation = validateBP(systolic, diastolic)
  if (!validation.valid) {
    return { value: null, display: '—', status: 'invalid', error: validation.error }
  }
  const { sys, dia } = validation
  const map = Math.round(dia + (sys - dia) / 3)
  return {
    value: map,
    display: `${map} mmHg`,
    target,
    meetsTarget: map >= target,
    status: map >= target ? 'adequate' : 'low',
    interpretation: map >= target ? `MAP adequate (>=${target})` : `MAP below target (${target})`,
  }
}

export interface QSOFAResult {
  score: number
  criteria: string[]
  sepsisSuspected: boolean
  recommendation: string
}

export function calculateQSOFA(
  alteredMentation: boolean,
  respiratoryRate: string | number,
  systolicBP: string | number
): QSOFAResult {
  let score = 0
  const criteria: string[] = []

  if (alteredMentation) { score += 1; criteria.push('Altered mentation') }
  const rr = parseNumericInput(respiratoryRate)
  if (rr !== null && rr >= 22) { score += 1; criteria.push(`RR >=22 (${rr})`) }
  const sbp = parseNumericInput(systolicBP)
  if (sbp !== null && sbp <= 100) { score += 1; criteria.push(`SBP <=100 (${sbp})`) }

  return {
    score,
    criteria,
    sepsisSuspected: score >= 2,
    recommendation: score >= 2
      ? 'Consider Sepsis: Lactate, Cultures, Antibiotics, Fluids'
      : 'Low suspicion - continue monitoring',
  }
}

export interface AnionGapResult {
  value: number | null
  correctedValue: number | null
  display: string
  elevated: boolean
  interpretation: string
  error?: string
}

export function calculateAnionGap(
  sodium: string | number,
  chloride: string | number,
  bicarbonate: string | number,
  albumin: string | number | null = null
): AnionGapResult {
  const na = parseNumericInput(sodium)
  const cl = parseNumericInput(chloride)
  const hco3 = parseNumericInput(bicarbonate)
  if (na === null || cl === null || hco3 === null) {
    return { value: null, correctedValue: null, display: '—', elevated: false, interpretation: '', error: 'Enter Na, Cl, HCO3' }
  }
  const ag = na - (cl + hco3)
  let correctedAG: number | null = null
  const alb = albumin !== null ? parseNumericInput(albumin) : null
  if (alb !== null) correctedAG = ag + 2.5 * (4 - alb)
  return {
    value: ag,
    correctedValue: correctedAG,
    display: `${ag} mEq/L`,
    elevated: ag > 12,
    interpretation: ag > 12 ? 'Elevated AG - consider MUDPILES' : 'Normal anion gap',
  }
}

export function calculateCorrectedSodium(sodium: string | number, glucose: string | number) {
  const na = parseNumericInput(sodium)
  const glu = parseNumericInput(glucose)
  if (na === null || glu === null) return { value: null, display: '—', error: 'Enter Na and Glucose' }
  if (glu <= 100) return { value: na, display: `${na} mEq/L`, correction: 0, note: 'No correction needed (glucose <=100)' }
  const correction = 1.6 * ((glu - 100) / 100)
  const corrected = Math.round((na + correction) * 10) / 10
  return { value: corrected, display: `${corrected} mEq/L`, originalValue: na, correction: Math.round(correction * 10) / 10, note: `Added ${Math.round(correction * 10) / 10} for glucose ${glu}` }
}

export function calculateFluidBolus(weightKg: string | number, mlPerKg = 30) {
  const weight = parseNumericInput(weightKg)
  if (weight === null || weight <= 0) return { value: null, display: '—', error: 'Enter weight' }
  const volume = Math.round(weight * mlPerKg)
  return { value: volume, display: `${volume} mL`, weight, rate: mlPerKg, bags: Math.ceil(volume / 1000), note: `${mlPerKg} mL/kg x ${weight} kg` }
}

export interface GCSResult {
  value: number | null
  display: string
  components: { eye: number; verbal: number; motor: number } | null
  severity: string
  intubationIndicated: boolean
  error?: string
}

export function calculateGCS(eye: string | number, verbal: string | number, motor: string | number): GCSResult {
  const e = parseNumericInput(eye)
  const v = parseNumericInput(verbal)
  const m = parseNumericInput(motor)
  if (e === null || v === null || m === null) return { value: null, display: '—', components: null, severity: '', intubationIndicated: false, error: 'Select E, V, M' }
  const total = e + v + m
  let severity: string
  if (total <= 8) severity = 'Severe'
  else if (total <= 12) severity = 'Moderate'
  else severity = 'Mild'
  return { value: total, display: `${total}/15`, components: { eye: e, verbal: v, motor: m }, severity, intubationIndicated: total <= 8 }
}

export interface ClinicalTimer {
  id: string
  label: string
  duration: number
  remaining: number
  startedAt: number
  status: 'running' | 'complete'
  intervalId: ReturnType<typeof setInterval> | null
}

export function createTimer(
  label: string,
  durationSeconds: number,
  onTick?: (timer: ClinicalTimer) => void,
  onComplete?: (timer: ClinicalTimer) => void
): ClinicalTimer {
  const timer: ClinicalTimer = {
    id: Date.now().toString(),
    label,
    duration: durationSeconds,
    remaining: durationSeconds,
    startedAt: Date.now(),
    status: 'running',
    intervalId: null,
  }

  timer.intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000)
    timer.remaining = Math.max(0, timer.duration - elapsed)
    onTick?.(timer)
    if (timer.remaining === 0) {
      timer.status = 'complete'
      if (timer.intervalId) clearInterval(timer.intervalId)
      onComplete?.(timer)
    }
  }, 1000)

  return timer
}

export function stopTimer(timer: ClinicalTimer): void {
  if (timer.intervalId) clearInterval(timer.intervalId)
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const CLINICAL_TIMERS = [
  { label: 'Reassess BP', duration: 600 },
  { label: 'Antibiotic Due', duration: 1800 },
  { label: 'Fluid Bolus Complete', duration: 900 },
  { label: 'Check Lactate', duration: 3600 },
]
