/**
 * Run async tasks with limited concurrency.
 * @param {number} limit - Max concurrent tasks
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function: (item) => Promise<result>
 * @returns {Promise<Array>} - Results in original order
 */
export async function asyncPool(limit, items, fn) {
  const results = [];
  const executing = new Set();

  for (const [index, item] of items.entries()) {
    const promise = fn(item, index).then((result) => {
      executing.delete(promise);
      return result;
    });
    results.push(promise);
    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
