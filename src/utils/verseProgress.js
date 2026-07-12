/**
 * Compute the active verse index from verse statistics based on sequential progression.
 * A verse is considered passed if it has started, has no pending words, and meets the accuracy threshold.
 * 
 * @param {Array} verseStats - Array of statistics for each verse from the recitation worker.
 * @param {number} threshold - The target accuracy percentage (e.g., 50).
 * @returns {number} The index of the currently active verse.
 */
export const computeActiveVerseIndex = (verseStats, threshold) => {
  if (!verseStats || verseStats.length === 0) return 0;

  let activeVerseIndex = 0;
  for (let i = 0; i < verseStats.length; i++) {
    const stat = verseStats[i];
    
    // Support fallback for older worker payloads missing hasStarted
    const hasStarted = stat.hasStarted !== undefined 
      ? stat.hasStarted 
      : !stat.hasPending;

    if (hasStarted && !stat.hasPending && stat.accuracy >= threshold) {
      activeVerseIndex = i + 1;
    } else {
      activeVerseIndex = i;
      break;
    }
  }

  if (activeVerseIndex >= verseStats.length) {
    activeVerseIndex = verseStats.length - 1;
  }

  return activeVerseIndex;
};
