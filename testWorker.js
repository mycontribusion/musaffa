const fuzzyTolerance = (word) => {
  const len = word.length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 2;  
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
    [prev, curr] = [prev, curr];
  }
  return prev[n];
};

const fuzzyMatch = (a, b) => {
  if (a === b) return true;
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
  const expWords = expectedText.split(/\s+/).filter(Boolean);
  const rawSpkWords = spokenText.split(/\s+/).filter(Boolean);

  const spkWords = [];
  for (let i = 0; i < rawSpkWords.length; i++) {
    if (i === 0 || rawSpkWords[i] !== rawSpkWords[i - 1]) {
      spkWords.push(rawSpkWords[i]);
    }
  }

  const expLen = expWords.length;
  const spkLen = spkWords.length;
  
  const dp = Array(expLen + 1).fill(null).map(() => Array(spkLen + 1).fill(0));
  const ptr = Array(expLen + 1).fill(null).map(() => Array(spkLen + 1).fill(0)); 

  for (let i = 0; i <= expLen; i++) {
    dp[i][0] = i; 
    ptr[i][0] = 3;
  }
  for (let j = 0; j <= spkLen; j++) {
    dp[0][j] = j; 
    ptr[0][j] = 2;
  }

  for (let i = 1; i <= expLen; i++) {
    for (let j = 1; j <= spkLen; j++) {
      const eW = expWords[i - 1];
      const sW = spkWords[j - 1];
      
      let matchCost = 2; 
      let isMatch = false;
      if (eW === sW) {
        matchCost = 0;
        isMatch = true;
      } else if (fuzzyMatch(eW, sW)) {
        matchCost = 0.5;
        isMatch = true;
      }

      if (isMatch) {
        matchCost += i * 0.0001;
      }

      const costSub = dp[i - 1][j - 1] + matchCost;
      const costInsert = dp[i][j - 1] + 1;
      const costOmit = dp[i - 1][j] + 1;

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
      i--; j--;
    } else if (op === 2) {
      alignment.unshift({ expIdx: null, spkIdx: j - 1, type: 'insertion' });
      j--;
    } else {
      alignment.unshift({ expIdx: i - 1, spkIdx: null, type: 'omission' });
      i--;
    }
  }

  return alignment;
};

// Verse 1-3, then Verse 4, then Verse 5
const expected = "عم يتساءلون عن النبإ العظيم الذي هم فيه مختلفون كلا سيعلمون ثم كلا سيعلمون";
const spoken = "عم يتساءلون عن النبإ العظيم الذي هم فيه مختلفون كلا سيعلمون سيعلمون";

const result = compareRecitation(expected, spoken);
console.log(result.slice(-10));
