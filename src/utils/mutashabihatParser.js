export const parseWaqarLine = (line) => {
  if (!line || !line.includes('|')) return null;
  const endOnly = line.includes('\\n');
  const clean = line.replace(/\\n|\r/g, '').trim();
  if (!clean) return null;

  const pipe = clean.indexOf('|');
  const parseRef = (s) => {
    const [su, ay] = s.trim().split(':').map(Number);
    return (!su || !ay || isNaN(su) || isNaN(ay)) ? null : { surah: su, ayah: ay };
  };

  const sources = clean.slice(0, pipe).split(',').map(parseRef).filter(Boolean);
  const mutGroups = clean.slice(pipe + 1).split('/').filter(g => g.trim())
    .map(g => g.split(',').map(parseRef).filter(Boolean)).filter(g => g.length > 0);

  if (!sources.length || !mutGroups.length) return null;
  return { sources, mutGroups, endOnly };
};

export const groupMutashabihatBySurah = (lines) => {
  const groups = {};
  const add = (s, entry) => {
    if (!groups[s]) groups[s] = [];
    const id = `${entry.sources[0].surah}:${entry.sources[0].ayah}`;
    if (!groups[s].some(e => `${e.sources[0].surah}:${e.sources[0].ayah}` === id))
      groups[s].push(entry);
  };
  lines.forEach(line => {
    const e = parseWaqarLine(line);
    if (!e) return;
    add(e.sources[0].surah, e);
    [...new Set(e.mutGroups.flat().map(v => v.surah))].forEach(s => {
      if (s !== e.sources[0].surah) add(s, e);
    });
  });
  return groups;
};

export const seededShuffle = (arr, seed = 1) => {
  const newArr = [...arr];
  let s = (seed <= 0 ? 1 : seed) * 16807;
  const nextRand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const shuffle = arr => seededShuffle(arr, Math.floor(Date.now() % 100000) + 1);

/**
 * Normalize Arabic text for deterministic alignment comparisons.
 */
export const normalizeForMatch = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0640/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
};

/**
 * Split two mutashabih verses at the exact point of divergence.
 * Returns the shared question stem and the differing option segments.
 */
export const splitMutashabih = (textAnchor, textOther) => {
  if (!textAnchor || !textOther) return null;
  const wA = textAnchor.trim().split(/\s+/);
  const wO = textOther.trim().split(/\s+/);
  const nA = wA.map(normalizeForMatch);
  const nO = wO.map(normalizeForMatch);

  // Exact duplicate verse across surahs
  if (nA.join(' ') === nO.join(' ')) {
    return {
      type: 'identical',
      stem: textAnchor,
      optAnchor: textAnchor,
      optOther: textOther,
    };
  }

  // 1. Longest Common Prefix (LCP)
  let lcp = 0;
  while (lcp < nA.length && lcp < nO.length && nA[lcp] === nO[lcp]) {
    lcp++;
  }

  if (lcp >= 1 && lcp < wA.length) {
    return {
      type: 'continuation',
      stem: wA.slice(0, lcp).join(' ') + ' ...',
      optAnchor: wA.slice(lcp).join(' '),
      optOther: wO.slice(lcp).join(' ') || textOther,
      splitIdxAnchor: lcp,
      splitIdxOther: lcp,
    };
  }

  // 2. Longest Common Substring (shared block anywhere inside the verses)
  let bestLen = 0, bestA = 0, bestO = 0;
  for (let i = 0; i < nA.length; i++) {
    for (let j = 0; j < nO.length; j++) {
      let len = 0;
      while (i + len < nA.length && j + len < nO.length && nA[i + len] === nO[j + len]) {
        len++;
      }
      if (len > bestLen) {
        bestLen = len;
        bestA = i;
        bestO = j;
      }
    }
  }

  if (bestLen >= 2) {
    const endA = bestA + bestLen;
    const endO = bestO + bestLen;

    if (endA < wA.length) {
      // Shared part comes first, then branches off (Continuation)
      return {
        type: 'continuation',
        stem: wA.slice(0, endA).join(' ') + ' ...',
        optAnchor: wA.slice(endA).join(' '),
        optOther: wO.slice(endO).join(' ') || textOther,
        splitIdxAnchor: endA,
        splitIdxOther: endO,
      };
    } else {
      // Shared part reaches the end of the verse (Divergence at beginning)
      return {
        type: 'beginning',
        stem: '... ' + wA.slice(bestA).join(' '),
        optAnchor: wA.slice(0, bestA).join(' '),
        optOther: wO.slice(0, bestO).join(' ') || textOther,
        splitIdxAnchor: bestA,
        splitIdxOther: bestO,
      };
    }
  }

  // Fallback: subtle single-word swap or general mutashabih
  return {
    type: 'phrase',
    stem: textAnchor.length > 80 ? textAnchor.slice(0, 80) + ' ...' : textAnchor,
    optAnchor: textAnchor,
    optOther: textOther,
  };
};

export const buildSessionCards = (entries, surahNum, quranAr, surahs) => {
  if (!entries?.length || !quranAr || !surahs) return [];
  const txt = (s, a) => quranAr?.surahs[s - 1]?.ayahs[a - 1]?.text || '';
  const nam = (s) => surahs?.[s - 1]?.englishName || `Surah ${s}`;

  const isBlockSide = (side) => {
    return side.length > 1 &&
      side.every(x => x.surah === side[0].surah) &&
      side.every((x, i) => i === 0 || x.ayah === side[i - 1].ayah + 1);
  };

  const getSideText = (side) => side.map(r => txt(r.surah, r.ayah)).filter(Boolean).join(' ');

  const unmergedCards = entries.map((entry, entryIdx) => {
    const { sources, mutGroups } = entry;
    const sides = [sources, ...mutGroups];

    // Find which side contains the active surah
    const anchorIdx = sides.findIndex(side => side.some(x => x.surah === surahNum));
    if (anchorIdx === -1) return null;

    const anchorSide = sides[anchorIdx];
    const otherSides = sides.filter((_, idx) => idx !== anchorIdx);
    if (!otherSides.length) return null;

    const anchorRef = anchorSide.find(x => x.surah === surahNum) || anchorSide[0];
    const isAnchorBlock = isBlockSide(anchorSide);
    const anchorText = isAnchorBlock ? getSideText(anchorSide) : txt(anchorRef.surah, anchorRef.ayah);
    if (!anchorText) return null;

    // Determine primary other side for reference split
    const primaryOtherSide = otherSides[0];
    const isPrimaryBlock = isBlockSide(primaryOtherSide);
    const primaryOtherRef = primaryOtherSide[0];
    const primaryOtherText = isPrimaryBlock ? getSideText(primaryOtherSide) : txt(primaryOtherRef.surah, primaryOtherRef.ayah);
    if (!primaryOtherText) return null;

    const split = splitMutashabih(anchorText, primaryOtherText);
    if (!split) return null;

    // Correct option from current surah
    const correctOpt = {
      surah: anchorRef.surah,
      ayah: anchorRef.ayah,
      surahName: nam(anchorRef.surah),
      text: split.optAnchor,
      fullText: anchorText,
      isCorrect: true,
    };

    // Build distractors from other side(s)
    const distractorOpts = [];
    const seenDistractors = new Set();

    otherSides.forEach(side => {
      const isBlock = isBlockSide(side);
      const candidates = isBlock ? [side] : side.map(ref => [ref]);

      candidates.forEach(cand => {
        const repRef = cand[0];
        const sideText = isBlock ? getSideText(cand) : txt(repRef.surah, repRef.ayah);
        if (!sideText) return;

        const sideSplit = splitMutashabih(anchorText, sideText);
        const optText = sideSplit?.optOther || sideText;
        const key = `${repRef.surah}:${repRef.ayah}:${optText}`;

        if (!seenDistractors.has(key) && optText !== correctOpt.text && distractorOpts.length < 3) {
          seenDistractors.add(key);
          distractorOpts.push({
            surah: repRef.surah,
            ayah: repRef.ayah,
            surahName: nam(repRef.surah),
            text: optText,
            fullText: sideText,
            isCorrect: false,
          });
        }
      });
    });

    if (distractorOpts.length === 0) return null;

    const options = [correctOpt, ...distractorOpts];

    let question = `Which continuation follows in ${nam(surahNum)}?`;
    if (split.type === 'beginning') {
      question = `How does this verse begin in ${nam(surahNum)}?`;
    } else if (split.type === 'phrase' || split.type === 'identical') {
      question = `Which verse phrasing belongs to ${nam(surahNum)}?`;
    }

    return {
      id: `mut-${anchorRef.surah}:${anchorRef.ayah}-${surahNum}-${entryIdx}`,
      stem: split.stem,
      contextVerse: {
        surah: anchorRef.surah,
        ayah: anchorRef.ayah,
        text: split.stem,
        surahName: nam(surahNum),
      },
      question,
      options,
      splitType: split.type,
    };
  }).filter(Boolean);

  // Deduplicate cards by their question & stem
  const mergedMap = new Map();
  unmergedCards.forEach(card => {
    const key = `${card.stem}-${card.question}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...card, options: [...card.options] });
    } else {
      const existing = mergedMap.get(key);
      card.options.forEach(opt => {
        if (!existing.options.some(o => o.surah === opt.surah && o.ayah === opt.ayah && o.text === opt.text)) {
          if (existing.options.length < 4) {
            existing.options.push(opt);
          }
        }
      });
    }
  });

  const cards = Array.from(mergedMap.values()).map(c => ({
    ...c,
    options: shuffle(c.options),
  }));

  return shuffle(cards);
};

export const findDifferences = (t1, t2) => {
  if (!t1 || !t2) return { diffs1: [], diffs2: [] };
  const w1 = t1.trim().split(/\s+/), w2 = t2.trim().split(/\s+/);
  const len = Math.max(w1.length, w2.length);
  const d1 = [], d2 = [];
  for (let i = 0; i < len; i++) {
    const a = w1[i] || '', b = w2[i] || '', diff = a !== b;
    d1.push({ text: a, isDifferent: diff });
    d2.push({ text: b, isDifferent: diff });
  }
  return { diffs1: d1, diffs2: d2 };
};
