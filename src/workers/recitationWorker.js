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

const compareRecitation = (expectedText, spokenText, ayahWordCounts = []) => {
  // Expected text is already expanded by PartnerSession, just normalize it
  const expWords = normalizeArabic(expectedText).split(/\s+/).filter(Boolean);
  
  // Normalize spoken text only — STT output naturally produces letter names
  // (e.g. "الف لام ميم"), which now match the expanded expected words directly.
  const spkNorm = normalizeArabic(spokenText);
  const rawSpkWords = spkNorm.split(/\s+/).filter(Boolean);

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

  // ── Dynamic Programming (Wagner-Fischer) Alignment ───────────────────────
  // We use DP to find the global optimal alignment, preventing "stolen words"
  // where a greedy lookahead might skip 20 correct words just to match a single dropped "wa".
  
  const expLen = expWords.length;
  const spkLen = spkWords.length;
  
  const dp = Array(expLen + 1).fill(null).map(() => Array(spkLen + 1).fill(0));
  const ptr = Array(expLen + 1).fill(null).map(() => Array(spkLen + 1).fill(0)); 
  // ptr: 1 = match/sub, 2 = insertion (skip spk), 3 = omission (skip exp)

  for (let i = 0; i <= expLen; i++) {
    dp[i][0] = i; // omissions
    ptr[i][0] = 3;
  }
  for (let j = 0; j <= spkLen; j++) {
    dp[0][j] = j; // insertions
    ptr[0][j] = 2;
  }

  for (let i = 1; i <= expLen; i++) {
    for (let j = 1; j <= spkLen; j++) {
      const eW = expWords[i - 1];
      const sW = spkWords[j - 1];
      
      let matchCost = 2; // high cost for faking a match
      let isMatch = false;
      if (eW === sW) {
        matchCost = 0;
        isMatch = true;
      } else if (fuzzyMatch(eW, sW)) {
        matchCost = 0.5;
        isMatch = true;
      }

      // Tie-breaker: Prefer matching the EARLIEST possible word in the expected text.
      // If a common word like "الله" or "كلا" appears multiple times, we want to 
      // consume the first one rather than jumping ahead. By adding a tiny penalty 
      // based on the expected index `i`, earlier words get a strictly lower cost.
      if (isMatch) {
        matchCost += i * 0.0001;
      }

      const costSub = dp[i - 1][j - 1] + matchCost;
      const costInsert = dp[i][j - 1] + 1;
      const costOmit = dp[i - 1][j] + 1;

      // Only allow substitution if it's an actual match or fuzzy match
      if (isMatch && costSub <= costInsert && costSub <= costOmit) {
        dp[i][j] = costSub;
        ptr[i][j] = 1;
      } else if (costInsert <= costOmit) {
        dp[i][j] = costInsert;
        ptr[i][j] = 2;
      } else {
        dp[i][j] = costOmit;
        ptr[i][j] = 3;
      }
    }
  }

  const alignment = [];
  let i = expLen;
  let j = spkLen;
  
  while (i > 0 || j > 0) {
    const op = ptr[i][j];
    if (op === 1) {
      alignment.unshift({ expIdx: i - 1, spkIdx: j - 1, type: 'match' });
      i--;
      j--;
    } else if (op === 2) {
      alignment.unshift({ expIdx: null, spkIdx: j - 1, type: 'insertion' });
      j--;
    } else {
      alignment.unshift({ expIdx: i - 1, spkIdx: null, type: 'omission' });
      i--;
    }
  }

  const results = Array(expLen).fill(null).map((_, idx) => ({ word: expWords[idx], status: 'omission', spokenWord: null }));
  const insertions = [];
  let lastMatchedExpIdx = -1;

  for (const item of alignment) {
    if (item.type === 'match') {
      const eIdx = item.expIdx;
      const sIdx = item.spkIdx;
      const isExact = expWords[eIdx] === spkWords[sIdx];
      results[eIdx] = {
        word: expWords[eIdx],
        status: isExact ? 'correct' : 'substitution',
        spokenWord: spkWords[sIdx]
      };
      if (eIdx > lastMatchedExpIdx) lastMatchedExpIdx = eIdx;
    } else if (item.type === 'insertion') {
      insertions.push({ word: spkWords[item.spkIdx], status: 'insertion' });
    }
  }

  // Any expected words AFTER the last successful match are considered "pending" (not yet spoken)
  for (let idx = lastMatchedExpIdx + 1; idx < expLen; idx++) {
    results[idx].status = 'pending';
  }

  // ── Smart Anchor & Threshold metrics BEFORE blocking ───────────────────
  const preBlockCorrect = results.filter(r => r.status === 'correct').length;
  const preBlockHasPending = results.some(r => r.status === 'pending');
  const preBlockAccuracy = Math.round((preBlockCorrect / expWords.length) * 100);
  const smartAnchorHit = results.length > 0 && results[results.length - 1].status === 'correct';

  // Re-calculate basic metrics since they were removed from the DP loop
  let correct = 0;
  let substitutions = 0;
  let omissions = 0;
  
  for (const r of results) {
    if (r.status === 'correct') correct++;
    else if (r.status === 'substitution') substitutions++;
    else if (r.status === 'omission') omissions++;
  }

  // Sequential blocking removed: DP alignment is global and accurate, so
  // words matched correctly after an error are genuinely correct and should
  // be shown as green. preBlockAccuracy (used for auto-advance) is unaffected.
  const accuracy = Math.round((correct / expWords.length) * 100);

  // ── Per-verse statistics ──────────────────────────────────────────────────
  const verseStats = [];
  if (ayahWordCounts && ayahWordCounts.length > 0) {
    let wordIdx = 0;
    for (let idx = 0; idx < ayahWordCounts.length; idx++) {
      const count = ayahWordCounts[idx];
      if (count === 0) {
        verseStats.push({ index: idx, accuracy: 0, hasPending: false });
        continue;
      }
      const verseSlice = results.slice(wordIdx, wordIdx + count);
      const verseCorrect = verseSlice.filter(r => r.status === 'correct').length;
      const verseAccuracy = Math.round((verseCorrect / count) * 100);
      const hasPending = verseSlice.some(r => r.status === 'pending');
      const hasStarted = verseSlice.some(r => r.status !== 'pending');
      
      verseStats.push({
        index: idx,
        accuracy: verseAccuracy,
        hasPending,
        hasStarted
      });
      wordIdx += count;
    }
  } else {
    const hasPending = results.some(r => r.status === 'pending');
    const hasStarted = results.some(r => r.status !== 'pending');
    verseStats.push({
      index: 0,
      accuracy: accuracy,
      hasPending,
      hasStarted
    });
  }

  let perVerseMinMet = true;
  for (const stat of verseStats) {
    if (stat.accuracy < 50) {
      perVerseMinMet = false;
      break;
    }
  }

  return {
    results,
    insertions,
    accuracy,
    breakdown: { correct, omissions, substitutions, insertions: insertions.length },
    smartAnchorHit,
    preBlockHasPending,
    preBlockAccuracy,
    perVerseMinMet,
    verseStats,
    // Word-level alignment frontier: the index of the last expected word that was
    // successfully matched. Everything after this index is still 'pending'.
    // Exposes the DP's internal state so the hook can target hints by exact word
    // position rather than inferring verse from per-verse booleans.
    lastMatchedExpIdx,
  };
};

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (event) => {
  const { type, expected, spoken, id, ayahWordCounts } = event.data;
  if (type === 'COMPARE') {
    const payload = compareRecitation(expected, spoken, ayahWordCounts || []);
    self.postMessage({ type: 'RESULT', payload, id });
  } else if (type === 'COMPARE_FINAL') {
    const payload = compareRecitation(expected, spoken, ayahWordCounts || []);
    self.postMessage({ type: 'RESULT_FINAL', payload, id });
  }
};
