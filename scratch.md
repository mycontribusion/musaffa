I need to rewrite `LiveTextOverlay` to accept the original `displayText` and map the expanded results back to the original words.

First, let's create a mapping of original words to expanded indices.
```javascript
const originalWords = displayText.trim().split(/\s+/).filter(Boolean);
const wordMapping = [];
let currentIndex = 0;

for (const origWord of originalWords) {
  const clean = removeTashkeel(origWord);
  const norm = normalizeArabic(clean);
  const exp = expandMuqattaat(norm);
  const expWords = exp.trim().split(/\s+/).filter(Boolean);
  const count = expWords.length;
  
  wordMapping.push({
    word: origWord,
    startIdx: currentIndex,
    count: count
  });
  currentIndex += count;
}
```

Then in `LiveTextOverlay`:
```javascript
const LiveTextOverlay = ({ displayText, results, wordOffset = 0 }) => {
  if (!displayText) return null;

  // Build mapping
  const originalWords = displayText.trim().split(/\s+/).filter(Boolean);
  const wordMapping = [];
  let currentIndex = 0;
  for (const origWord of originalWords) {
    const clean = removeTashkeel(origWord);
    const exp = normalizeArabic(expandMuqattaat(clean));
    const count = exp.trim().split(/\s+/).filter(Boolean).length;
    wordMapping.push({ word: origWord, startIdx: currentIndex, count: count });
    currentIndex += count;
  }

  const getStatus = (mapping) => {
    let hasPending = false;
    let hasError = false;
    let hasCorrect = false;

    for (let i = 0; i < mapping.count; i++) {
      const globalIdx = mapping.startIdx + i + wordOffset;
      const status = results && globalIdx < results.length ? results[globalIdx]?.status : 'pending';
      if (status === 'pending') hasPending = true;
      else if (status === 'correct') hasCorrect = true;
      else hasError = true;
    }

    if (hasPending && !hasError && !hasCorrect) return 'pending';
    if (hasError) return 'omission'; // or substitution, map to red
    if (hasPending && hasCorrect) return 'pending'; // partially spoken? 
    return 'correct';
  };
  
  // Render using wordMapping
  return (
    <p ...>
      {wordMapping.map((mapping, idx) => {
         const status = getStatus(mapping);
         ...
      })}
    </p>
  )
}
```
