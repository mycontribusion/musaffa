# Plan: Hands-Free Visual Error Indicators

## Goal
Make the app usable without requiring the user to continuously stare at the screen by adding visual blink indicators:
- **Green blink**: When all words are correctly recited (no errors) - ONLY after any previous errors have been resolved
- **Red blink**: When an error (omission/substitution) is detected

## Critical Requirements (from user clarification)
1. **No green after red**: Once a word is marked as incorrect, the user must correct it before getting "all correct" status
2. **Verse/ayah mismatch prevention**: The algorithm should NOT allow matching words from future verses to "fix" errors in current verses
3. **Error resolution workflow**: User must correct incorrect recitation before proceeding

## Current State Analysis

### Existing Components:
- `RedBlinkOverlay.jsx`: Flashes red overlay when errors are present (used in `RecitationFeedbackCard` and `MudarasaView`)
- `MudarasaView.jsx`: Uses `errorFlash` state to trigger red blink on error count increase during live recitation
- `useRecitationCheck.js`: Provides `liveResults` with word statuses (correct/omission/substitution/pending/unresolved)
- `recitationWorker.js`: Contains the matching algorithm with `unresolved` status for words not yet matched

### Current Limitations:
1. No green blink indicator when recitation is correct
2. Red blink only triggers on error count **increase** - if user corrects, blink doesn't re-trigger
3. No continuous visual feedback for hands-free operation
4. The matching algorithm marks `unresolved` words as `pending` at the end, which allows forward-progress to "fix" omissions

## Implementation Plan

### 1. Create GreenBlinkOverlay Component
**File:** `src/components/GreenBlinkOverlay.jsx` (new file)

Create a component that flashes a semi-transparent green overlay when all words are correct:
- Mirrors `RedBlinkOverlay` structure but uses green color
- Triggers when `allCorrect` state is true and stable

### 2. Modify recitationWorker.js (and quranUtils.js)
**File:** `src/workers/recitationWorker.js` AND `src/utils/quranUtils.js`

The core issue: Words marked as `omission`/`substitution` should NEVER become `correct` later. The algorithm must:
- Track which words have already been "confirmed" as incorrect
- NOT allow future spoken words to retroactively fix earlier errors - this causes the "skip verses" problem
- Keep `unresolved` status until correctly matched or final check confirms omission

**Key change to the worker algorithm**:
Currently (lines 256-279): When a match is found, unresolved words become omissions. This is correct.
But the issue is in the live comparison: as STT continues, the algorithm re-runs the entire comparison, potentially matching words in different positions.

The fix needs to be in the LIVE comparison flow (not final):
- Pass the CURRENT results to the worker along with the new spoken text
- The worker should preserve already-confirmed `omission`/`substitution` statuses
- Only update `unresolved`/`pending` statuses as new speech comes in

**Alternative approach** (simpler):
Keep the current worker logic, but modify `useRecitationCheck.js` to:
- Not update results if we already have errors (wait for correction)
- Only accept changes that would reduce error count (user correcting by re-speaking)

### 3. Modify MudarasaView.jsx
**File:** `src/components/MudarasaView.jsx`

Add logic to track and display both indicators:
- Track `hasErrors` state that persists once any error occurs
- Show green blink ONLY when: `mudarasaTurn === 'user'`, `enableErrorDetection`, ALL words are `correct`, AND no previous errors in this turn
- Show red blink immediately when: ANY word has `omission` or `substitution` status
- Ensure indicators don't flash simultaneously - priority to red on error

### 4. Indicator Behavior
**Green Blink:**
- Triggers when `liveResults.results.every(r => r.status === 'correct')` becomes true
- Only during user's recitation turn (`mudarasaTurn === 'user'`)
- **CRITICAL**: Will NOT trigger if any error occurred earlier in the turn (must be resolved)
- Stops immediately when an error appears

**Red Blink:**
- Triggers immediately when ANY error is detected (omission/substitution)
- Uses vibration pattern (200ms) for physical feedback  
- Persists until turn ends or errors are corrected

### 5. Visual Design
- **Green overlay**: `rgba(16, 185, 129, 0.4)` - semi-transparent emerald
- **Red overlay**: `rgba(239, 68, 68, 0.4)` - semi-transparent red (existing)
- Both use same 0.3s fade animation as current `RedBlinkOverlay`

## Files to Modify/Create

| File | Action |
|------|--------|
| `src/components/GreenBlinkOverlay.jsx` | Create new component |
| `src/components/MudarasaView.jsx` | Add green blink logic, refine red blink trigger, track error resolution state |
| `src/workers/recitationWorker.js` | Prevent resolved errors from being "fixed" by future matches |

## Success Criteria
1. User can close eyes or look away and know when they've made an error (red blink)
2. User gets positive confirmation (green blink) when reciting correctly - ONLY if no prior errors
3. Once red (error) appears, no green until the error is corrected by user
4. Matching algorithm does NOT allow future verses to "fix" errors in current verses
5. No interference with existing auto-advance logic (100% accurate auto-switch)