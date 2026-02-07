type HapticPattern =
  | 'tap'
  | 'success'
  | 'warning'
  | 'error'
  | 'modeSwitch'
  | 'tick'
  | 'escalation'

const patterns: Record<HapticPattern, number[]> = {
  tap: [10],
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 100, 50, 100],
  modeSwitch: [70],
  tick: [5],
  escalation: [50, 50, 50, 50, 100],
}

export function triggerHaptic(type: HapticPattern): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(patterns[type] ?? patterns.tap)
  } catch {
    // Silently fail on unsupported devices
  }
}

export const hapticPatterns = {
  taskComplete: () => triggerHaptic('success'),
  criticalFlag: () => triggerHaptic('warning'),
  escalation: () => triggerHaptic('escalation'),
  labScanned: () => triggerHaptic('tick'),
  imageCapture: () => triggerHaptic('tap'),
  errorOccurred: () => triggerHaptic('error'),
}
