/**
 * recitationWorker.js
 *
 * Web Worker for running compareRecitation off the main thread.
 * Receives: { type: 'COMPARE', expected: string, spoken: string }
 * Sends:    { type: 'RESULT', payload: ComparisonResult }
 */

// ── Inline all pure functions (workers can't import from src/) ────────────────

const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0640/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[،؛؟!.,:;'"()[\]{}]/g, '')
    .replace(/(.)\1{3,}/g, '$1$1')
    .trim();
};

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
};

const fuzzyTolerance = (word) => {
  const len = word.length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 2;  // cap at 2 to avoid over-matching long words
};

const fuzzyMatch = (a, b) => {
  if (a === b) return true;
  // Prevent matching words that differ only in the last character
  // (e.g., الرحمن vs الرحيم) to avoid confusing similar Quranic words
  if (a.length === b.length && a.length > 1) {
    const aBody = a.slice(0, -1);
    const bBody = b.slice(0, -1);
    if (aBody === bBody) return false;
  }
  const tol = Math.min(fuzzyTolerance(a), fuzzyTolerance(b));
  if (tol === 0) return false;
  if (Math.abs(a.length - b.length) > tol) return false;
  return levenshtein(a, b) <= tol;
};

const compareRecitation = (expectedText, spokenText) => {
  // Strip tashkeel from expected text only — STT output typically lacks harakat,
  // so we normalise the reference to plain letters for a fair word-level comparison.
  const expNorm = expectedText.replace(/[\u064B-\u065F]/g, '');
  const expWords = normalizeArabic(expNorm).split(/\s+/).filter(Boolean);
  const rawSpkWords = normalizeArabic(spokenText).split(/\s+/).filter(Boolean);

  // Deduplicate consecutive identical words in spoken text.
  // STT often repeats words (e.g., "الله الله الله" → "الله"), which would
  // cause the limited lookahead to miss subsequent expected words.
  const spkWords = [];
  for (let i = 0; i < rawSpkWords.length; i++) {
    if (i === 0 || rawSpkWords[i] !== rawSpkWords[i - 1]) {
      spkWords.push(rawSpkWords[i]);
    }
  }

  if (expWords.length === 0) return { results: [], insertions: [], accuracy: 100, breakdown: { correct: 0, omissions: 0, substitutions: 0, insertions: 0 } };
  if (spkWords.length === 0) {
    return {
      results: expWords.map(w => ({ word: w, status: 'omission', spokenWord: null })),
      insertions: [],
      accuracy: 0,
      breakdown: { correct: 0, omissions: expWords.length, substitutions: 0, insertions: 0 },
    };
  }

  // Sequential matching: enforce positional order to prevent earlier words
  // from being "stolen" by later similar words as the transcript grows.
  const results = [];
  const insertions = [];
  let spkIdx = 0;
  let correct = 0, omissions = 0, substitutions = 0;

  for (let expIdx = 0; expIdx < expWords.length; expIdx++) {
    const expWord = expWords[expIdx];

    // Look for a match in the next few spoken words (limited lookahead)
    let bestMatch = -1;
    const lookahead = Math.min(30, spkWords.length - spkIdx);
    for (let i = 0; i < lookahead; i++) {
      const candidateIdx = spkIdx + i;
      if (fuzzyMatch(expWord, spkWords[candidateIdx])) {
        bestMatch = candidateIdx;
        break; // Use the first (earliest) match to maintain order
      }
    }

    if (bestMatch !== -1) {
      // Mark any skipped spoken words as insertions
      for (let i = spkIdx; i < bestMatch; i++) {
        insertions.push({ word: spkWords[i], status: 'insertion' });
      }

      const spkWord = spkWords[bestMatch];
      const isExact = expWord === spkWord;
      results.push({
        word: expWord,
        status: isExact ? 'correct' : 'substitution',
        spokenWord: spkWord,
      });
      if (isExact) correct++;
      else substitutions++;

      spkIdx = bestMatch + 1;
    } else {
      results.push({ word: expWord, status: 'omission', spokenWord: null });
      omissions++;
    }
  }

  // Remaining spoken words are insertions
  for (let i = spkIdx; i < spkWords.length; i++) {
    insertions.push({ word: spkWords[i], status: 'insertion' });
  }

  const accuracy = Math.round((correct / expWords.length) * 100);

  return {
    results,
    insertions,
    accuracy,
    breakdown: { correct, omissions, substitutions, insertions: insertions.length },
  };
};

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (event) => {
  const { type, expected, spoken, id } = event.data;
  if (type === 'COMPARE') {
    const payload = compareRecitation(expected, spoken);
    self.postMessage({ type: 'RESULT', payload, id });
  }
};
