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
  return 2;
};

const fuzzyMatch = (a, b) => {
  if (a === b) return true;
  const tol = Math.min(fuzzyTolerance(a), fuzzyTolerance(b));
  if (tol === 0) return false;
  if (Math.abs(a.length - b.length) > tol) return false;
  return levenshtein(a, b) <= tol;
};

const compareRecitation = (expectedText, spokenText) => {
  const expWords = normalizeArabic(expectedText).split(/\s+/).filter(Boolean);
  const spkWords = normalizeArabic(spokenText).split(/\s+/).filter(Boolean);

  if (expWords.length === 0) return { results: [], insertions: [], accuracy: 100, breakdown: { correct: 0, omissions: 0, substitutions: 0, insertions: 0 } };
  if (spkWords.length === 0) {
    return {
      results: expWords.map(w => ({ word: w, status: 'pending' })),
      insertions: [],
      accuracy: 0,
      breakdown: { correct: 0, omissions: expWords.length, substitutions: 0, insertions: 0 },
    };
  }

  const m = expWords.length;
  const n = spkWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Int16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = fuzzyMatch(expWords[i - 1], spkWords[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matches = [];
  let bi = m, bj = n;
  while (bi > 0 && bj > 0) {
    if (fuzzyMatch(expWords[bi - 1], spkWords[bj - 1])) {
      matches.unshift({ expIdx: bi - 1, spkIdx: bj - 1 });
      bi--; bj--;
    } else if (dp[bi - 1][bj] >= dp[bi][bj - 1]) {
      bi--;
    } else {
      bj--;
    }
  }

  const alignment = [];
  const processGap = (expStart, expEnd, spkStart, spkEnd) => {
    const expLen = expEnd - expStart;
    const spkLen = spkEnd - spkStart;
    const subLen = Math.min(expLen, spkLen);
    for (let k = 0; k < subLen; k++) {
      alignment.push({ type: 'substitution', expWord: expWords[expStart + k], spkWord: spkWords[spkStart + k] });
    }
    for (let k = subLen; k < expLen; k++) {
      alignment.push({ type: 'omission', expWord: expWords[expStart + k], spkWord: null });
    }
    for (let k = subLen; k < spkLen; k++) {
      alignment.push({ type: 'insertion', expWord: null, spkWord: spkWords[spkStart + k] });
    }
  };

  let lastExpIdx = -1, lastSpkIdx = -1;
  for (const match of matches) {
    processGap(lastExpIdx + 1, match.expIdx, lastSpkIdx + 1, match.spkIdx);
    alignment.push({ type: 'correct', expWord: expWords[match.expIdx], spkWord: spkWords[match.spkIdx] });
    lastExpIdx = match.expIdx;
    lastSpkIdx = match.spkIdx;
  }
  processGap(lastExpIdx + 1, m, lastSpkIdx + 1, n);

  const results = alignment
    .filter(a => a.expWord !== null)
    .map(a => ({ word: a.expWord, status: a.type, spokenWord: a.spkWord || null }));

  const insertions = alignment
    .filter(a => a.type === 'insertion')
    .map(a => ({ word: a.spkWord, status: 'insertion' }));

  // Words beyond what the user has spoken yet → mark as 'pending' (not yet reached)
  const spokenWordCount = spkWords.length;
  let spokenSoFar = 0;
  const resultsWithPending = results.map(r => {
    if (r.status === 'correct' || r.status === 'substitution') spokenSoFar++;
    if (spokenSoFar === 0 && r.status === 'omission') return { ...r, status: 'pending' };
    return r;
  });

  const correct = resultsWithPending.filter(r => r.status === 'correct').length;
  const omissions = resultsWithPending.filter(r => r.status === 'omission').length;
  const substitutions = resultsWithPending.filter(r => r.status === 'substitution').length;
  const accuracy = Math.round((correct / m) * 100);

  return {
    results: resultsWithPending,
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
