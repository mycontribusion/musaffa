# Fix Plan: Error Indicators and Sequential Blocking

## Issues Fixed

### 1. Remove Green Flash - Only Red Flash on Error
**File:** `src/components/RedBlinkOverlay.jsx` ✅

**Change:** Removed the `isCorrect` branch and the green overlay entirely. The component now only shows the red error overlay.

### 2. Stop Flashing When App is Reciting
**File:** `src/components/MudarasaView.jsx` (line 34) ✅

**Change:** Added `mudarasaTurn === 'user'` check to the overlay condition. The overlay now only shows during user's recitation turn, not when the app is playing.

**Before:**
```js
if (enableErrorDetection && isSttListening && liveResults?.results?.length > 0)
```

**After:**
```js
if (enableErrorDetection && mudarasaTurn === 'user' && isSttListening && liveResults?.results?.length > 0)
```

### 3. Sequential Blocking - Treat Pending as Blocker
**File:** `src/workers/recitationWorker.js` (lines 200-219) ✅
**File:** `src/utils/quranUtils.js` (lines 294-314) ✅

**Change:** Updated the blocking logic to find the first non-`correct` word (including `pending`) and reset everything after it to `pending`.

**Before:**
```js
if (results[i].status === 'omission' || results[i].status === 'substitution')
```

**After:**
```js
if (results[i].status !== 'correct')
```

This ensures that if there's a gap (pending word), words after it won't show as correct.

### 4. Clear Live Results When Turn Switches
**File:** `src/hooks/useRecitationCheck.js` (line 261-262) ✅

**Change:** Added `setLiveResults(null)` when `isActive` becomes false to prevent lingering state when the turn switches from user to app.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/RedBlinkOverlay.jsx` | Removed green/correct overlay, kept only red error overlay |
| `src/components/MudarasaView.jsx` | Added `mudarasaTurn === 'user'` check to overlay condition |
| `src/workers/recitationWorker.js` | Updated sequential blocking to treat `pending` as a blocker |
| `src/utils/quranUtils.js` | Updated sequential blocking to treat `pending` as a blocker |
| `src/hooks/useRecitationCheck.js` | Added `setLiveResults(null)` when turn switches away from user |

## Expected Behavior After Fix

1. **No green flash:** The overlay only shows red when there's an error, no green flash at all.
2. **No overlay during app recitation:** The overlay is only active during the user's turn (`mudarasaTurn === 'user'`).
3. **Proper sequential blocking:** If there's a pending word (unspoken), all words after it are blocked from showing as correct. If there's an error (omission/substitution), all words after it are also blocked.
4. **Clean state transitions:** When the turn switches from user to app, the live results are cleared to prevent lingering state.