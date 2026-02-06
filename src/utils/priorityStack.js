/**
 * Priority Stack - Dynamic tool sorting algorithm
 * Surfaces the most relevant tools based on patient context
 */

import { clinicalTools } from '../config/modeConfig';

/**
 * Score a tool based on current context
 * Higher score = higher priority
 */
export function scoreTool(tool, context) {
  let score = 0;
  const now = Date.now();

  // 1. Time criticality (highest weight in emergency mode)
  if (context.mode === 'emergency') {
    if (tool.timeCritical) score += 1000;
    if (tool.severity === 'critical') score += 500;
  }

  // 2. Patient context presence
  if (tool.requiresPatient && context.selectedPatient) {
    score += 200;
  } else if (tool.requiresPatient && !context.selectedPatient) {
    score -= 1000; // Tool needs patient but none selected
  }

  // 3. Diagnosis matching
  if (context.suspectedDiagnosis) {
    const diagnosisLower = context.suspectedDiagnosis.toLowerCase();
    const matchesDiagnosis = tool.appliesTo.some(
      (condition) =>
        diagnosisLower.includes(condition.toLowerCase()) ||
        condition.toLowerCase().includes(diagnosisLower)
    );
    if (matchesDiagnosis) score += 500;
  }

  // 4. Critical lab matching
  if (context.criticalLabs && context.criticalLabs.length > 0) {
    const matchingLabs = tool.requiresLabs.filter((labType) =>
      context.criticalLabs.some(
        (criticalLab) =>
          criticalLab.toLowerCase().includes(labType.toLowerCase()) ||
          labType.toLowerCase().includes(criticalLab.toLowerCase())
      )
    );
    score += matchingLabs.length * 150;
  }

  // 5. Tag matching with patient conditions
  if (context.patientConditions && context.patientConditions.length > 0) {
    const matchingTags = tool.tags.filter((tag) =>
      context.patientConditions.some(
        (condition) =>
          condition.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(condition.toLowerCase())
      )
    );
    score += matchingTags.length * 100;
  }

  // 6. Recency boost (tool used in last 5 mins stays relevant)
  if (tool.lastUsed && now - tool.lastUsed < 5 * 60 * 1000) {
    score += 300;
  }

  // 7. Time-of-day workflow relevance (ward mode)
  if (context.mode === 'ward') {
    const hour = new Date().getHours();

    // Morning rounds (6am - 12pm)
    if (hour >= 6 && hour < 12) {
      if (tool.tags.includes('documentation') || tool.tags.includes('rounds')) {
        score += 100;
      }
    }

    // Afternoon (12pm - 6pm)
    if (hour >= 12 && hour < 18) {
      if (tool.tags.includes('tasks') || tool.tags.includes('workflow')) {
        score += 50;
      }
    }

    // Evening/Handover (6pm - 9pm)
    if (hour >= 18 && hour < 21) {
      if (tool.tags.includes('handover') || tool.tags.includes('summary')) {
        score += 100;
      }
    }
  }

  // 8. Mode-specific baseline
  if (tool.mode === context.mode) {
    score += 50;
  }

  return Math.max(0, score);
}

/**
 * Get sorted tools for a mode based on context
 */
export function getSortedTools(mode, context) {
  const tools = Object.values(clinicalTools).filter((tool) => tool.mode === mode);

  const scoredTools = tools.map((tool) => ({
    ...tool,
    score: scoreTool(tool, { ...context, mode }),
  }));

  return scoredTools.sort((a, b) => b.score - a.score);
}

/**
 * Get top N priority tools
 */
export function getTopTools(mode, context, count = 6) {
  return getSortedTools(mode, context).slice(0, count);
}

/**
 * Check if a tool should be highlighted as high priority
 */
export function isHighPriority(tool, context) {
  const score = scoreTool(tool, context);
  return score >= 1000;
}

/**
 * Get tools that match specific criteria
 */
export function filterTools(mode, criteria) {
  const tools = Object.values(clinicalTools).filter((tool) => tool.mode === mode);

  return tools.filter((tool) => {
    if (criteria.severity && tool.severity !== criteria.severity) return false;
    if (criteria.timeCritical !== undefined && tool.timeCritical !== criteria.timeCritical)
      return false;
    if (criteria.tags && !criteria.tags.some((tag) => tool.tags.includes(tag))) return false;
    if (criteria.requiresPatient !== undefined && tool.requiresPatient !== criteria.requiresPatient)
      return false;
    return true;
  });
}

/**
 * Track tool usage for recency scoring
 */
const toolUsageMap = new Map();

export function recordToolUsage(toolId) {
  toolUsageMap.set(toolId, Date.now());
}

export function getToolLastUsed(toolId) {
  return toolUsageMap.get(toolId) || null;
}

/**
 * Clear tool usage history
 */
export function clearToolUsageHistory() {
  toolUsageMap.clear();
}

export default {
  scoreTool,
  getSortedTools,
  getTopTools,
  isHighPriority,
  filterTools,
  recordToolUsage,
  getToolLastUsed,
  clearToolUsageHistory,
};
