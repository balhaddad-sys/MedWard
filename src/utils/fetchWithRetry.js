/**
 * Fetch with exponential backoff retry.
 * Retries on 502, 503, 504, and network errors.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {object} config
 * @param {number} config.maxRetries - default 3
 * @param {number} config.baseDelayMs - default 500
 * @param {number} config.timeoutMs - default 120000 (2 min)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
  const { maxRetries = 3, baseDelayMs = 500, timeoutMs = 120000 } = config;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Don't retry client errors (4xx) — those are our fault
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Retry on server errors (502, 503, 504)
      if (attempt < maxRetries && [502, 503, 504].includes(response.status)) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] ${response.status} on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response; // Final attempt — return whatever we got
    } catch (error) {
      clearTimeout(timeoutId);

      const isNetworkError =
        error.name === 'AbortError' ||
        error.name === 'TypeError' || // fetch network failures
        error.message?.includes('Failed to fetch');

      if (attempt < maxRetries && isNetworkError) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] Network error on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw error; // Final attempt — bubble up
    }
  }
}
