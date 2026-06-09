# Fix Plan: Musaffa Error Detection Turn & Scoring Bugs

## User Requirements (Clarified)

- **No silence-based switching.** Auto-switch only when all words in the live overlay are green (status `correct`).
- **No word-count-based pending logic.** The `lastReachedExpIdx` approach that marks words as `pending` based on spoken word count should be removed.
- **UI text:** "Stops when you finish reading" (not "Stops when you go quiet").
- **Quiet user:** If the user is quiet from the start, they can manually tap "Tap to finish early" or "Finished Reciting" — no auto-switch needed.

---

## Root Cause Analysis

### Bug 1 & 3: Turn switches before user finishes / scores prematurely

**File:** `src/hooks/useRecitationCheck.js` (lines 70-86)

```js
const allResolved = payload.results.every(r => r.status !== 'pending');
if (allResolved) {
  // auto-finish after 600ms
}
```

Two problems:
1. `allResolved` fires when all words have a non-`pending` status — including `omission` and `substitution`. It should only fire when ALL words are `correct`.
2. The worker's `lastReachedExpIdx = Math.min(n - 1, m - 1)` marks words as `pending` based on spoken word count, not on actual comparison results. This causes premature `allResolved` when `spokenWords >= expectedWords`.

### Bug 2: Quiet user = stuck turn

**File:** `src/hooks/useRecitationCheck.js` (line 162)

```js
recognition.onspeechend = () => {
  if (!hasSpeechRef.current) return;  // blocks auto-finish if no speech ever occurred
  ...
};
```

The Web Speech API only fires `onspeechend` after `onspeechstart`. If the user is completely silent, neither event fires, and the turn is stuck. Additionally, error-detection mode skips the silence timer entirely (`if (!isActiveRef.current)`).

---

## Fix Plan

### Fix 1: Change `allResolved` to check for all-correct

**File:** `src/hooks/useRecitationCheck.js` (lines 70-86)

Change:
```js
const allResolved = payload.results.every(r => r.status !== 'pending');
```
To:
```js
const allCorrect = payload.results.length > 0 && payload.results.every(r => r.status === 'correct');
```

This ensures auto-switch only happens when every word in the live overlay is green.

### Fix 2: Remove word-count-based `pending` logic from worker

**File:** `src/workers/recitationWorker.js` (lines 131-142)

Remove the `lastReachedExpIdx` block entirely:
```js
// REMOVE:
const lastReachedExpIdx = Math.min(n - 1, m - 1);
const resultsWithPending = results.map((r, idx) => {
  if (idx > lastReachedExpIdx) {
    return { ...r, status: 'pending' };
  }
  return r;
});
```

And use `results` directly instead of `resultsWithPending` for the return value and accuracy calculation.

Also update the empty-speech case (line 65-72) to return `omission` status instead of `pending`:
```js
if (spkWords.length === 0) {
  return {
    results: expWords.map(w => ({ word: w, status: 'omission', spokenWord: null })),
    insertions: [],
    accuracy: 0,
    breakdown: { correct: 0, omissions: expWords.length, substitutions: 0, insertions: 0 },
  };
}
```

### Fix 3: Remove silence timer from error-detection mode

**File:** `src/hooks/useRecitationCheck.js` (lines 161-173)

Remove the `if (!isActiveRef.current)` guard so the silence timer is never used in error-detection mode. The `onspeechend` handler should only clear the `hasSpeechRef` flag and do nothing else — no auto-finish.

Actually, since we're removing silence-based switching entirely, we can simplify `onspeechend` to just track speech state:
```js
recognition.onspeechend = () => {
  hasSpeechRef.current = true;
};
```

And remove the `silenceTimerRef` logic from `onspeechend` and `onspeechstart` entirely for error-detection mode.

### Fix 4: Update UI text

**File:** `src/components/MudarasaView.jsx` (line 251)

Change:
```js
<span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: '600' }}>Stops when you go quiet</span>
```
To:
```js
<span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: '600' }}>Stops when you finish reading</span>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/workers/recitationWorker.js` | Remove `lastReachedExpIdx` pending logic; return `omission` for empty speech |
| `src/hooks/useRecitationCheck.js` | Change `allResolved` to `allCorrect`; remove silence timer from error-detection mode |
| `src/components/MudarasaView.jsx` | Update UI text to "Stops when you finish reading" |

---

## Expected Behavior After Fix

1. **Turn stays during active recitation:** User can pause, make mistakes, or recite out of order — the turn only switches when ALL words are green (correct).
2. **No premature switching:** Word-count comparison is removed; `allResolved` now means truly all-correct.
3. **Quiet user:** If the user is quiet from the start, all words show as `omission` (red), `allCorrect` is false, and the turn does NOT auto-switch. The user must tap "Tap to finish early" or "Finished Reciting" manually.
4. **Scoring happens after full correct recitation:** The comparison runs live, but the turn only advances (and triggers final scoring) when every word is confirmed correct.
