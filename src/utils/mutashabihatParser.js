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

  const cards = entries.map(entry => {
    const { sources, mutGroups, endOnly } = entry;
    // sides: source block is side 0, each mutGroup is a subsequent side
    const sides = [sources, ...mutGroups];

    // Find which side contains the current surah
    const anchorIdx = sides.findIndex(side => side.some(x => x.surah === surahNum));
    if (anchorIdx === -1) return null;
    const anchorSide = sides[anchorIdx];

    // Build options: one per side. Use first verse of each side.
    // For mixed-surah sides (e.g. [2:208, 24:21]), expand to individual verses.
    const buildOptions = (useNext) => {
      const opts = [];
      sides.forEach((side, si) => {
        const isAnchor = si === anchorIdx;
        // A "block" = same surah AND consecutive ayahs (e.g. [69:22, 69:23])
        // Non-consecutive same-surah (e.g. [20:43, 20:24]) = separate options
        const sorted = [...side].sort((a, b) => a.ayah - b.ayah);
        const isBlock = side.every(x => x.surah === side[0].surah) &&
          sorted.every((x, i) => i === 0 || x.ayah === sorted[i - 1].ayah + 1);

        if (isBlock) {
          const rep = useNext ? side[side.length - 1] : side[0];
          const o = useNext ? v(rep.surah, rep.ayah + 1) : v(rep.surah, rep.ayah);
          if (o.text) opts.push({ ...o, isCorrect: isAnchor });
        } else {
          side.forEach(x => {
            const o = useNext ? v(x.surah, x.ayah + 1) : v(x.surah, x.ayah);
            if (o.text) opts.push({ ...o, isCorrect: isAnchor && x.surah === surahNum });
          });
        }
      });
      return shuffle(opts);
    };

    if (endOnly) {
      // Show anchor's last verse; ask what follows each competing verse
      const last = anchorSide[anchorSide.length - 1];
      const options = buildOptions(true);
      if (options.length < 2) return null;
      return {
        id: `end-${sources[0].surah}:${sources[0].ayah}-${surahNum}`,
        contextVerse: v(last.surah, last.ayah),
        contextLabel: `${nam(last.surah)} · ${last.surah}:${last.ayah}`,
        question: 'Which verse follows?',
        options,
      };
    } else {
      // Show previous verse of anchor; options are the competing verses themselves
      const first = anchorSide[0];
      const prev = v(first.surah, first.ayah - 1);
      if (!prev.text || prev.surah !== first.surah) return null;
      const options = buildOptions(false);
      if (options.length < 2) return null;
      return {
        id: `cont-${sources[0].surah}:${sources[0].ayah}-${surahNum}`,
        contextVerse: prev,
        contextLabel: `${nam(prev.surah)} · ${prev.surah}:${prev.ayah}`,
        question: `Which verse follows in Surah ${nam(surahNum)}?`,
        options,
      };
    }
  }).filter(Boolean);

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
