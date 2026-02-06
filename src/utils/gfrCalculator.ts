// CKD-EPI 2021 Creatinine Equation (race-free)
export const calculateGFR = (
  creatinine: number,
  age: number,
  gender: 'male' | 'female'
): number => {
  let kappa: number, alpha: number, femaleFactor: number

  if (gender === 'female') {
    kappa = 0.7
    alpha = -0.241
    femaleFactor = 1.012
  } else {
    kappa = 0.9
    alpha = -0.302
    femaleFactor = 1.0
  }

  const scrKappa = creatinine / kappa
  const minVal = Math.min(scrKappa, 1)
  const maxVal = Math.max(scrKappa, 1)

  const gfr = 142 * Math.pow(minVal, alpha) * Math.pow(maxVal, -1.200) * Math.pow(0.9938, age) * femaleFactor

  return Math.round(gfr)
}

export const getGFRStage = (gfr: number): { stage: string; description: string; color: string } => {
  if (gfr >= 90) return { stage: 'G1', description: 'Normal or high', color: 'text-green-600' }
  if (gfr >= 60) return { stage: 'G2', description: 'Mildly decreased', color: 'text-yellow-600' }
  if (gfr >= 45) return { stage: 'G3a', description: 'Mildly to moderately decreased', color: 'text-orange-500' }
  if (gfr >= 30) return { stage: 'G3b', description: 'Moderately to severely decreased', color: 'text-orange-600' }
  if (gfr >= 15) return { stage: 'G4', description: 'Severely decreased', color: 'text-red-500' }
  return { stage: 'G5', description: 'Kidney failure', color: 'text-red-700' }
}

export const formatGFR = (gfr: number): string => {
  if (gfr > 120) return '>120 mL/min/1.73m²'
  return `${gfr} mL/min/1.73m²`
}
