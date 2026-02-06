// ─── Undo Manager: Stack-based undo/redo for safety-critical actions ─────────

const MAX_STEPS = 30;

let history = [];
let currentStep = -1;

/**
 * Record a state snapshot with a label for undo.
 * @param {any} state - The state to save (must be serializable)
 * @param {string} label - Human-readable action label
 */
export function recordUndo(state, label) {
  // Remove any redo history
  history = history.slice(0, currentStep + 1);

  history.push({
    state: JSON.parse(JSON.stringify(state)),
    label,
    timestamp: new Date().toISOString(),
  });

  currentStep++;

  // Trim to max size
  if (history.length > MAX_STEPS) {
    history.shift();
    currentStep--;
  }
}

/**
 * Undo the last action.
 * @returns {{ state: any, label: string } | null}
 */
export function undo() {
  if (currentStep > 0) {
    currentStep--;
    return history[currentStep];
  }
  return null;
}

/**
 * Redo the last undone action.
 * @returns {{ state: any, label: string } | null}
 */
export function redo() {
  if (currentStep < history.length - 1) {
    currentStep++;
    return history[currentStep];
  }
  return null;
}

/**
 * Check if undo is available.
 */
export function canUndo() {
  return currentStep > 0;
}

/**
 * Check if redo is available.
 */
export function canRedo() {
  return currentStep < history.length - 1;
}

/**
 * Clear all undo history.
 */
export function clearUndoHistory() {
  history = [];
  currentStep = -1;
}
