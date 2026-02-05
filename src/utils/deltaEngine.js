export function computeTrend(current, previous) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  const pctChange = Math.abs(diff / previous) * 100;
  if (pctChange < 5) return 'Stable';
  return diff > 0 ? 'Rising' : 'Falling';
}

export function getDeltaSeverity(testName, current, previous) {
  if (!previous) return 'neutral';
  const diff = Math.abs(current - previous);
  const pctChange = (diff / previous) * 100;

  // Hemoglobin: >2 g/dL drop = acute
  if (testName === 'Hemoglobin' && current < previous && diff >= 2) return 'critical';
  // Potassium: any value > 6.0 or < 3.0
  if (testName === 'Potassium' && (current > 6.0 || current < 3.0)) return 'critical';
  // WBC: >20 or <1
  if (testName === 'WBC' && (current > 20 || current < 1)) return 'critical';
  // Creatinine: doubling = AKI
  if (testName === 'Creatinine' && current >= previous * 2) return 'critical';

  if (pctChange > 20) return 'warning';
  if (pctChange > 5) return 'minor';
  return 'neutral';
}

export function getTrendColor(severity) {
  const colors = {
    critical: '#DC2626',
    warning: '#D97706',
    minor: '#64748B',
    neutral: '#94A3B8',
  };
  return colors[severity] || colors.neutral;
}

export function checkCritical(testName, value, ranges) {
  const range = ranges[testName];
  if (!range) return false;
  return value < range.criticalMin || value > range.criticalMax;
}
