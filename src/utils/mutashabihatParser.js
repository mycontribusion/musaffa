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

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

export const buildSessionCards = (entries, surahNum, quranAr, surahs) => {
  const txt = (s, a) => quranAr?.surahs[s - 1]?.ayahs[a - 1]?.text || '';
  const nam = (s) => surahs?.[s - 1]?.englishName || `Surah ${s}`;
  const v = (s, a) => ({ surah: s, ayah: a, text: txt(s, a), surahName: nam(s) });

  const unmergedCards = entries.map(entry => {
    const { sources, mutGroups, endOnly } = entry;
    // sides: source block is side 0, each mutGroup is a subsequent side
    const sides = [sources, ...mutGroups];

    // Find which side contains the current surah
    const anchorIdx = sides.findIndex(side => side.some(x => x.surah === surahNum));
    if (anchorIdx === -1) return null;
    const anchorSide = sides[anchorIdx];

    // Find the specific verse(s) within the anchor side that belong to current surah
    const anchorVerses = anchorSide.filter(x => x.surah === surahNum);
    if (!anchorVerses.length) return null;

    // Build options: one correct (from current surah) + one per other side
    const buildOptions = (useNext) => {
      const opts = [];
      sides.forEach((side, si) => {
        const isAnchor = si === anchorIdx;

        if (isAnchor) {
          // Use only the current surah's verse(s) from this side as the correct answer
          const sorted = [...anchorVerses].sort((a, b) => a.ayah - b.ayah);
          const isBlock = sorted.every((x, i) => i === 0 || x.ayah === sorted[i - 1].ayah + 1);
          if (isBlock) {
            const rep = useNext ? sorted[sorted.length - 1] : sorted[0];
            const o = useNext ? v(rep.surah, rep.ayah + 1) : v(rep.surah, rep.ayah);
            if (o.text) opts.push({ ...o, isCorrect: true });
          } else {
            sorted.forEach(x => {
              const o = useNext ? v(x.surah, x.ayah + 1) : v(x.surah, x.ayah);
              if (o.text) opts.push({ ...o, isCorrect: true });
            });
          }
        } else {
          // Distractor: pick one representative verse from the other side
          const sorted = [...side].sort((a, b) => a.ayah - b.ayah);
          const isBlock = side.every(x => x.surah === side[0].surah) &&
            sorted.every((x, i) => i === 0 || x.ayah === sorted[i - 1].ayah + 1);
          if (isBlock) {
            const rep = useNext ? sorted[sorted.length - 1] : sorted[0];
            const o = useNext ? v(rep.surah, rep.ayah + 1) : v(rep.surah, rep.ayah);
            if (o.text) opts.push({ ...o, isCorrect: false });
          } else {
            // For non-consecutive mixed sides, pick first verse per unique surah
            const seen = new Set();
            sorted.forEach(x => {
              if (!seen.has(x.surah)) {
                seen.add(x.surah);
                const o = useNext ? v(x.surah, x.ayah + 1) : v(x.surah, x.ayah);
                if (o.text) opts.push({ ...o, isCorrect: false });
              }
            });
          }
        }
      });
      return opts;
    };

    // Show verse BEFORE the anchor's first verse (must be within current surah)
    const sortedAnchor = [...anchorVerses].sort((a, b) => a.ayah - b.ayah);
    const first = sortedAnchor[0];
    const prev = v(first.surah, first.ayah - 1);
    if (!prev.text || prev.surah !== first.surah || first.ayah <= 1) return null;
    const options = buildOptions(false);
    if (options.length < 2) return null;
    return {
      id: `cont-${sources[0].surah}:${sources[0].ayah}-${surahNum}`,
      contextVerse: prev,
      contextLabel: `${nam(prev.surah)} · ${prev.surah}:${prev.ayah}`,
      question: `Which verse follows in ${nam(surahNum)}?`,
      options,
    };
  }).filter(Boolean);

  const mergedMap = new Map();
  unmergedCards.forEach(card => {
    const key = `${card.contextVerse.surah}-${card.contextVerse.ayah}-${card.question}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...card, options: [...card.options] });
    } else {
      const existingCard = mergedMap.get(key);
      card.options.forEach(opt => {
        // Only add if not already in existingCard.options
        if (!existingCard.options.some(o => o.surah === opt.surah && o.ayah === opt.ayah)) {
          existingCard.options.push(opt);
        }
      });
    }
  });

  const cards = Array.from(mergedMap.values()).map(c => ({
    ...c,
    options: shuffle(c.options)
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
