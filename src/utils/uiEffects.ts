/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
/**
 * UI Effects Utilities for Premium Clinical Interface
 * Provides debouncing, typewriter effects, and skeleton loading templates
 */

/**
 * Prevents function execution until a pause in events occurs.
 * Critical for expensive AI API calls to avoid cost spikes.
 * @param func - The function to execute (e.g., callAI)
 * @param wait - The delay in milliseconds (recommend 800-1000ms for AI)
 * @returns The debounced wrapper function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    // Clear the previous timer if the user keeps typing
    if (timeout) {
      clearTimeout(timeout);
    }

    // Set a new timer
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Simulates a natural typing effect for AI responses.
 * Creates premium "co-pilot thinking with you" experience.
 * @param element - The DOM element to type into
 * @param text - The full string to type
 * @param baseSpeed - Base ms per character (lower = faster, default 15)
 * @param callback - Optional callback when typing completes
 */
export function typeWriterEffect(
  element: HTMLElement | HTMLInputElement | HTMLTextAreaElement | null,
  text: string,
  baseSpeed: number = 15,
  callback?: () => void
): void {
  if (!element || !text) return;

  // 1. Reset the element
  const isInput = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

  if (isInput) {
    element.value = '';
  } else {
    element.textContent = '';
  }

  let i = 0;

  function type() {
    if (i < text.length) {
      // Append the next character
      const char = text.charAt(i);

      if (isInput) {
        (element as HTMLInputElement | HTMLTextAreaElement).value += char;
        // Auto-scroll textarea to bottom
        (element as HTMLTextAreaElement).scrollTop = (element as HTMLTextAreaElement).scrollHeight;
      } else {
        (element as HTMLElement).textContent += char;
      }

      i++;

      // 2. The "Organic" Variance
      // Adds a random delay (0-20ms) to make it feel less like a machine
      // and more like a high-speed data stream.
      const randomVariance = Math.random() * 20;
      setTimeout(type, baseSpeed + randomVariance);
    } else {
      // Typing complete
      element?.classList.remove('typing-active');
      if (callback) callback();
    }
  }

  element.classList.add('typing-active');
  type(); // Start the recursion
}

/**
 * Skeleton template for the Smart Guidance Panel
 * Shows structure while AI is "thinking"
 */
export const skeletonTemplate = `
  <div class="ai-panel-loading">
    <div class="skeleton skeleton-text-short mb-2"></div>
    <div class="flex gap-2 mb-4">
      <div class="skeleton skeleton-chip"></div>
      <div class="skeleton skeleton-chip"></div>
      <div class="skeleton skeleton-chip"></div>
    </div>

    <div class="skeleton skeleton-text-short mb-2"></div>
    <div class="skeleton skeleton-card mb-2"></div>
    <div class="skeleton skeleton-card"></div>
  </div>
`;

/**
 * Shows skeleton loading state in a panel
 * @param element - The DOM element to inject skeleton into
 */
export function showSkeletonLoader(element: HTMLElement | null): void {
  if (!element) return;
  element.innerHTML = skeletonTemplate;
}

/**
 * Removes skeleton and fades out smoothly
 * @param element - The container element
 * @param callback - Function to call after fade completes
 */
export function hideSkeletonLoader(
  element: HTMLElement | null,
  callback?: () => void
): void {
  if (!element) return;

  const loader = element.querySelector('.ai-panel-loading');
  if (loader) {
    (loader as HTMLElement).style.opacity = '0';

    setTimeout(() => {
      element.innerHTML = '';
      if (callback) callback();
    }, 200); // Short delay for the fade-out
  }
}

/**
 * Throttle function - ensures function runs at most once per interval
 * Different from debounce: throttle runs immediately then waits, debounce waits then runs
 * @param func - Function to throttle
 * @param limit - Minimum time between calls (ms)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Formats a timestamp to relative time ("2 mins ago", "just now")
 * @param date - Date object or timestamp
 */
export function formatRelativeTime(date: Date | number): string {
  const now = Date.now();
  const timestamp = date instanceof Date ? date.getTime() : date;
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 30) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  // Format as date if older than a week
  return new Date(timestamp).toLocaleDateString();
}
