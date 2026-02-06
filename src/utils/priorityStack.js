// ─── Priority Stack: Dynamic tool sorting for clinical context ──────────────

const SEVERITY_WEIGHT = { critical: 40, urgent: 25, standard: 10 };

const CATEGORY_WORKFLOW = {
  morning: ['communication', 'transitions', 'pharmacy'],
  afternoon: ['renal', 'metabolic', 'infectious'],
  night: ['emergency', 'palliative'],
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 20) return 'afternoon';
  return 'night';
}

/**
 * Score a clinical tool based on current patient context.
 *
 * @param {Object} tool - Tool definition from clinicalTools
 * @param {Object} context - { patient, labs, mode }
 * @returns {number} Priority score (higher = more relevant)
 */
export function scoreTool(tool, context = {}) {
  let score = 0;
  const { patient, labs, mode } = context;

  // 1. Base severity score
  score += SEVERITY_WEIGHT[tool.severity] || 10;

  // 2. Time-of-day workflow relevance
  const timeSlot = getTimeOfDay();
  const relevantCategories = CATEGORY_WORKFLOW[timeSlot] || [];
  if (relevantCategories.includes(tool.category)) {
    score += 15;
  }

  // 3. Time-sensitive tools get boosted in emergency mode
  if (tool.timeSensitive && mode === 'emergency') {
    score += 30;
  }

  // 4. Patient diagnosis matching
  if (patient?.diagnosis) {
    const dx = patient.diagnosis.toLowerCase();
    const toolLabel = tool.label.toLowerCase();
    const toolPrompt = tool.prompt.toLowerCase();

    if (dx.includes('sepsis') && (tool.id === 'sepsis' || tool.id === 'antibiotic')) score += 25;
    if (dx.includes('dka') && tool.id === 'dka') score += 25;
    if (dx.includes('aki') && tool.id === 'aki') score += 25;
    if (dx.includes('chest pain') && tool.id === 'chest_pain') score += 25;
    if (dx.includes('stroke') && tool.id === 'stroke') score += 25;
    if (dx.includes('pneumonia') && tool.id === 'antibiotic') score += 20;
    if (dx.includes('diabetes') && tool.id === 'insulin') score += 20;

    // Generic keyword match
    if (dx.split(/\s+/).some((w) => toolLabel.includes(w) || toolPrompt.includes(w))) {
      score += 10;
    }
  }

  // 5. Lab-driven boosts
  if (labs?.length > 0) {
    const hasCriticalLab = labs.some((l) => l.isCritical);
    const hasAbnormalElectrolytes = labs.some(
      (l) => l.isAbnormal && ['Potassium', 'Sodium', 'Calcium', 'Magnesium'].includes(l.testName)
    );
    const hasAbnormalRenal = labs.some(
      (l) => l.isAbnormal && ['Creatinine', 'Urea'].includes(l.testName)
    );

    if (hasCriticalLab && tool.severity === 'critical') score += 15;
    if (hasAbnormalElectrolytes && tool.id === 'electrolyte') score += 20;
    if (hasAbnormalRenal && tool.id === 'aki') score += 20;
  }

  // 6. Patient status boost
  if (patient?.currentStatus === 'Critical' && tool.severity === 'critical') {
    score += 15;
  }

  return score;
}

/**
 * Sort tools by priority score in descending order.
 *
 * @param {Array} tools - Array of tool definitions
 * @param {Object} context - { patient, labs, mode }
 * @returns {Array} Sorted tools with scores attached
 */
export function sortByPriority(tools, context = {}) {
  return tools
    .map((tool) => ({ ...tool, _score: scoreTool(tool, context) }))
    .sort((a, b) => b._score - a._score);
}
