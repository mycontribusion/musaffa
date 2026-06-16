# Threshold-Based Turn Switching Implementation Plan

## User Requirements Summary

The turn should switch only when ALL three conditions are met:
1. **Per-verse threshold**: Each verse in the chunk must reach the user-defined accuracy percentage
2. **Chunk threshold**: The overall chunk must reach the user-defined accuracy percentage
3. **Last word condition**: The last word of the chunk must be correctly recited

If the user reaches the last verse without fulfilling these conditions, they must repeat the chunk.

---

## Current Implementation Analysis

### Current Turn-Switching Logic

**Location:** `src/hooks/useRecitationCheck.js` (lines 90-112)

The current logic in the worker message handler checks:
```javascript
if (preBlockAccuracy >= thresholdRef.current && smartAnchorHit) {
  // Auto-finish after 300ms
}
```

Where:
- `preBlockAccuracy` = percentage of correct words in the entire chunk
- `smartAnchorHit` = last word of the chunk is correct

**Missing:** Per-verse accuracy tracking

### Current Data Flow

```
User speaks → Web Speech API → useRecitationCheck.js → recitationWorker.js
                                                       ↓
                                              Word-level comparison
                                                       ↓
                                              Returns: results[], accuracy, smartAnchorHit
                                                       ↓
                                              useRecitationCheck evaluates conditions
                                                       ↓
                                              onAutoFinish() called if conditions met
```

---

## Implementation Steps

### Step 1: Add Per-Verse Accuracy Tracking in Worker

**File:** `src/workers/recitationWorker.js`

**Changes needed:**
- Modify `compareRecitation()` to track which words belong to which verse
- Add `verseAccuracies` array to the return payload
- Each entry: `{ verseIndex, correctCount, totalCount, accuracy }`

**Implementation approach:**
```javascript
// In compareRecitation, after building results:
const verseAccuracies = [];
let currentWordIndex = 0;

chunk.forEach((ayah, verseIndex) => {
  const verseWordCount = ayahText.split(/\s+/).filter(Boolean).length;
  const verseResults = results.slice(currentWordIndex, currentWordIndex + verseWordCount);
  const correctInVerse = verseResults.filter(r => r.status === 'correct').length;
  const totalInVerse = verseResults.length;
  
  verseAccuracies.push({
    verseIndex,
    correctCount: correctInVerse,
    totalCount: totalInVerse,
    accuracy: Math.round((correctInVerse / totalInVerse) * 100)
  });
  
  currentWordIndex += verseWordCount;
});
```

### Step 2: Pass Verse Boundaries to Worker

**File:** `src/hooks/useRecitationCheck.js`

**Changes needed:**
- Pass verse boundary information to the worker
- Include `verseBoundaries` in the COMPARE message:
  ```javascript
  workerRef.current.postMessage({
    type: 'COMPARE',
    expected: expectedRef.current,
    spoken,
    id,
    verseBoundaries: [wordCount1, wordCount2, ...] // cumulative word counts per verse
  });
  ```

### Step 3: Update Turn-Switching Logic

**File:** `src/hooks/useRecitationCheck.js`

**New conditions to check:**
```javascript
// All 3 conditions must be true:
const allVerseThresholdsMet = payload.verseAccuracies.every(
  v => v.accuracy >= thresholdRef.current
);
const chunkThresholdMet = payload.preBlockAccuracy >= thresholdRef.current;
const lastWordCorrect = payload.smartAnchorHit;

if (allVerseThresholdsMet && chunkThresholdMet && lastWordCorrect) {
  // Auto-finish after 300ms
}
```

### Step 4: Add "Repeat Chunk" Logic

**File:** `src/hooks/useRecitationCheck.js` and `src/components/PartnerSession.jsx`

**When to trigger repeat:**
- User has spoken all words (no pending words remain)
- But conditions are NOT met
- AND we're at the last verse of the chunk

**Implementation:**
- Add `onRepeatChunk` callback to `useRecitationCheck`
- When `smartAnchorHit` is true but other conditions fail, call `onRepeatChunk`
- This should reset the turn to the same chunk without advancing

### Step 5: Update UI for Per-Verse Progress

**File:** `src/components/MudarasaView.jsx`

**Changes needed:**
- Show per-verse accuracy indicators
- Display threshold status (met/not met) for each verse
- Add visual indicator when user needs to repeat

### Step 6: Add User-Configurable Threshold

**File:** `src/components/PartnerConfig.jsx`

**Changes needed:**
- Add slider/input for accuracy threshold (default: 55%)
- Add description: "Each verse and the entire portion must reach this accuracy to advance"
- Pass threshold to `useRecitationCheck`

---

## Data Structures

### Updated Worker Return Payload

```javascript
{
  results: [
    { word: string, status: 'correct'|'substitution'|'omission'|'pending', spokenWord: string|null }
  ],
  insertions: [{ word: string, status: 'insertion' }],
  accuracy: number,
  breakdown: { correct, omissions, substitutions, insertions },
  smartAnchorHit: boolean,
  preBlockAccuracy: number,
  preBlockHasPending: boolean,
  verseAccuracies: [
    { verseIndex: number, correctCount: number, totalCount: number, accuracy: number }
  ]
}
```

---

## Edge Cases to Handle

1. **Empty speech**: All words are omission, no auto-switch
2. **Partial recitation**: Pending words exist, no auto-switch
3. **Mistakes in early verses**: User must correct before advancing
4. **Threshold not met on last verse**: Trigger repeat
5. **User taps "Tap to finish early"**: Manual override (current behavior)

---

## Testing Scenarios

1. User recites perfectly → Turn switches
2. User has 100% on some verses, 0% on others → Turn does NOT switch
3. User reaches last word but accuracy is 40% (threshold 55%) → Turn does NOT switch, repeat triggered
4. User has 55% on all verses but last word wrong → Turn does NOT switch
5. User is quiet → No auto-switch, manual finish available

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/workers/recitationWorker.js` | Add verse accuracy tracking |
| `src/hooks/useRecitationCheck.js` | Update conditions, add repeat callback |
| `src/components/MudarasaView.jsx` | Show per-verse progress |
| `src/components/PartnerConfig.jsx` | Add threshold configuration UI |
| `src/components/PartnerSession.jsx` | Handle repeat chunk logic |