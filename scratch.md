I've analyzed the smart mode logic, and I found a significant desynchronization bug between how the UI determines the active verse and how the audio hint system determines the active verse.

### The Bug:
In `MudarasaView.jsx`, the active verse is calculated with strict sequential progression. A verse is only considered "completed" (allowing progression to the next verse) if it meets three conditions: `hasStarted && !hasPending && accuracy >= targetAccuracy`.

However, in `useRecitationCheck.js`, the `activeVerseIndex` for the stuck timer is calculated by simply finding the highest-index verse where `hasStarted` is true, searching backwards from the end of the array:
```javascript
let activeVerseIndex = 0;
for (let i = stats.length - 1; i >= 0; i--) {
  if (hasStarted) {
    activeVerseIndex = i;
    break;
  }
}
```

### How this causes issues:
1. **No hint when stuck between verses**: If a user perfectly completes Verse 0 and is completely silent because they forgot how Verse 1 starts, `hasStarted` for Verse 1 is false. The hook will calculate `activeVerseIndex` as `0`. Because Verse 0's accuracy is already above the threshold, the hook decides no hint is needed (`stuckIndex = -1`), leaving the user permanently stuck without an audio hint for Verse 1.
2. **Premature hints for future verses**: If the user is on Verse 1 and hasn't met the threshold, but the speech recognition engine hallucinates a word that the DP algorithm maps to Verse 2, `hasStarted` becomes true for Verse 2. The hook will set `activeVerseIndex` to `2` and play the audio hint for Verse 2, even though the UI is correctly enforcing that the user is still stuck on Verse 1!

### The Fix:
You need to align the `activeVerseIndex` calculation in `useRecitationCheck.js` to match the exact same strict sequential logic used in `MudarasaView.jsx`.
