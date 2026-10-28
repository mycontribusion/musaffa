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

/**
 * Expand multi-verse block parallels (e.g. 2:47,2:48|2:122,2:123 or 19:14,19:15|19:32,19:33)
 * into their respective 1-to-1 verse pairings.
 */
export const expandBlockEntry = (entry) => {
  if (!entry) return [];
  const { sources, mutGroups, endOnly } = entry;
  const isBlockParallel = sources.length > 1 && mutGroups.some(g => g.length === sources.length);
  if (!isBlockParallel) return [entry];

  const subEntries = [];
  for (let k = 0; k < sources.length; k++) {
    const pairedMutGroups = mutGroups.map(g => {
      if (g.length === sources.length) return [g[k]];
      return g;
    });
    subEntries.push({
      sources: [sources[k]],
      mutGroups: pairedMutGroups,
      // For multi-verse block sequences, the lead verse leads into the next verse (endOnly: true),
      // whereas subsequent verses represent their own continuation/divergence
      endOnly: k === 0 && endOnly,
    });
  }
  return subEntries;
};

export const groupMutashabihatBySurah = (lines) => {
  const groups = {};
  const add = (s, entry, entryKey) => {
    if (!groups[s]) groups[s] = [];
    if (!groups[s].some(e => e._entryKey === entryKey)) {
      groups[s].push({ ...entry, _entryKey: entryKey });
    }
  };
  lines.forEach((line, idx) => {
    const rawEntry = parseWaqarLine(line);
    if (!rawEntry) return;
    const expandedEntries = expandBlockEntry(rawEntry);
    expandedEntries.forEach((e, subIdx) => {
      const entryKey = `${e.sources.map(r => `${r.surah}:${r.ayah}`).join(',')}|${e.mutGroups.flat().map(r => `${r.surah}:${r.ayah}`).join(',')}-${idx}-${subIdx}`;
      add(e.sources[0].surah, e, entryKey);
      [...new Set(e.mutGroups.flat().map(v => v.surah))].forEach(s => {
        if (s !== e.sources[0].surah) add(s, e, entryKey);
      });
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
 * Align a candidate distractor to the exact stem continuation boundary.
 */
export const alignDistractor = (nA, wA, splitA, nD, wD, distractorRef, txt) => {
  const stemNorm = nA.slice(0, splitA);

  // 1. Check if stem appears internally in distractor directly before a match with anchor continuation
  // e.g. 14:6 where 'إِذْ' appears internally before 'أَنجَىٰكُم مِّنْ ءَالِ فِرْعَوْنَ...'
  let bestInternalCut = -1;
  let bestInternalScore = 0;

  for (let i = 1; i <= nD.length - splitA; i++) {
    let stemMatch = true;
    for (let k = 0; k < splitA; k++) {
      if (nD[i + k] !== stemNorm[k] && !(splitA === 1 && stemNorm[k] === 'واذ' && nD[i + k] === 'اذ')) {
        stemMatch = false;
        break;
      }
    }
    if (stemMatch) {
      let matchAfter = 0;
      while (i + splitA + matchAfter < nD.length && splitA + matchAfter < nA.length &&
             nD[i + splitA + matchAfter] === nA[splitA + matchAfter]) {
        matchAfter++;
      }
      let matchAfter1 = 0;
      while (i + splitA + 1 + matchAfter1 < nD.length && splitA + 1 + matchAfter1 < nA.length &&
             nD[i + splitA + 1 + matchAfter1] === nA[splitA + 1 + matchAfter1]) {
        matchAfter1++;
      }
      const score = Math.max(matchAfter, matchAfter1);
      if (score >= 3 && score > bestInternalScore) {
        bestInternalScore = score;
        bestInternalCut = i + splitA;
      }
    }
  }

  if (bestInternalCut > 0) {
    return { text: wD.slice(bestInternalCut).join(' '), ayah: distractorRef.ayah };
  }

  // 2. Direct prefix match: distractor starts with the stem
  let dLcp = 0;
  while (dLcp < splitA && dLcp < nD.length && nD[dLcp] === nA[dLcp]) {
    dLcp++;
  }

  if (dLcp === splitA) {
    if (wD.length > splitA) {
      return { text: wD.slice(splitA).join(' '), ayah: distractorRef.ayah };
    }
    // Verse ended at stem boundary (e.g. Ta-Ha 20:116) -> use subsequent ayah
    const nextText = txt(distractorRef.surah, distractorRef.ayah + 1);
    if (nextText) {
      return { text: nextText, ayah: distractorRef.ayah + 1 };
    }
  }

  return null;
};

/**
 * Split two mutashabih verses at the exact point of divergence.
 * Preserved for utility and test backwards compatibility.
 */
export const splitMutashabih = (textAnchor, textOther) => {
  if (!textAnchor || !textOther) return null;
  const wA = textAnchor.trim().split(/\s+/);
  const wO = textOther.trim().split(/\s+/);
  const nA = wA.map(normalizeForMatch);
  const nO = wO.map(normalizeForMatch);

  if (nA.join(' ') === nO.join(' ')) {
    return {
      type: 'identical',
      stem: textAnchor,
      optAnchor: textAnchor,
      optOther: textOther,
    };
  }

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
      return {
        type: 'continuation',
        stem: wA.slice(0, endA).join(' ') + ' ...',
        optAnchor: wA.slice(endA).join(' '),
        optOther: wO.slice(endO).join(' ') || textOther,
        splitIdxAnchor: endA,
        splitIdxOther: endO,
      };
    } else {
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

  const expandedEntries = entries.flatMap(expandBlockEntry);
  const cards = [];

  expandedEntries.forEach((entry, entryIdx) => {
    const { sources, mutGroups, endOnly } = entry;
    // Each reference is an individual verse (no block concatenation)
    const allRefs = [...sources, ...mutGroups.flat()];

    // Find anchor ref for this surah
    const anchorRef = allRefs.find(r => r.surah === surahNum) || sources[0];
    const anchorText = txt(anchorRef.surah, anchorRef.ayah);
    if (!anchorText) return;

    // Distractor candidate refs
    const otherRefs = allRefs.filter(r => !(r.surah === anchorRef.surah && r.ayah === anchorRef.ayah));
    if (!otherRefs.length) return;

    const primaryOther = otherRefs[0];
    const primaryOtherText = txt(primaryOther.surah, primaryOther.ayah);
    if (!primaryOtherText) return;

    const wA = anchorText.trim().split(/\s+/);
    const nA = wA.map(normalizeForMatch);
    const wO = primaryOtherText.trim().split(/\s+/);
    const nO = wO.map(normalizeForMatch);

    // Exact duplicate verse across surahs or within the same surah
    if (nA.join(' ') === nO.join(' ')) {
      const nextAnchor = txt(anchorRef.surah, anchorRef.ayah + 1);
      if (!nextAnchor) return;

      const distractorOpts = [];
      const seen = new Set([`${anchorRef.surah}:${anchorRef.ayah + 1}`]);

      otherRefs.forEach(r => {
        const nextOther = txt(r.surah, r.ayah + 1);
        const key = `${r.surah}:${r.ayah + 1}`;
        if (nextOther && nextOther.trim() !== anchorText.trim() && !seen.has(key) && distractorOpts.length < 3) {
          seen.add(key);
          distractorOpts.push({
            surah: r.surah,
            ayah: r.ayah + 1,
            surahName: nam(r.surah),
            text: nextOther,
            fullText: nextOther,
            isCorrect: false,
          });
        }
      });

      if (distractorOpts.length > 0) {
        const isSameSurah = otherRefs.some(r => r.surah === anchorRef.surah);
        let question = `Which verse follows in ${nam(surahNum)}?`;
        const options = [{
          surah: anchorRef.surah,
          ayah: anchorRef.ayah + 1,
          surahName: nam(anchorRef.surah),
          text: nextAnchor,
          fullText: nextAnchor,
          isCorrect: true,
        }, ...distractorOpts];

        if (isSameSurah) {
          question = `Which following verse comes first in ${nam(surahNum)}?`;
          let minIdx = 0;
          for (let i = 1; i < options.length; i++) {
            if (options[i].surah < options[minIdx].surah ||
                (options[i].surah === options[minIdx].surah && options[i].ayah < options[minIdx].ayah)) {
              minIdx = i;
            }
          }
          options.forEach(o => { o.isCorrect = false; });
          options[minIdx].isCorrect = true;
        }

        cards.push({
          id: `next-${anchorRef.surah}:${anchorRef.ayah}-${entryIdx}`,
          stem: anchorText,
          contextVerse: {
            surah: anchorRef.surah,
            ayah: anchorRef.ayah,
            text: anchorText,
            surahName: nam(surahNum),
          },
          question,
          options,
          splitType: 'nextVerse',
        });
        return;
      }
    }

    // Check for end-similarity (fawasil / end of verse)
    let endMatchLen = 0;
    while (endMatchLen < nA.length && endMatchLen < nO.length &&
           nA[nA.length - 1 - endMatchLen] === nO[nO.length - 1 - endMatchLen]) {
      endMatchLen++;
    }

    let lcp = 0;
    while (lcp < nA.length && lcp < nO.length && nA[lcp] === nO[lcp]) lcp++;

    // Paradigm 1: Next Verse
    // Trigger when entry has endOnly flag (\n) OR when similarity is at verse ending with 0 common prefix.
    // Two sub-cases:
    //   a) endOnly flag (\n): verses share an ending, show next verse for all.
    //   b) End-similarity only (lcp===0 && endMatchLen>=2): anchor ends at the shared block;
    //      distractors may still have words remaining AFTER the shared block within their ayah.
    //      In that case, use the mid-ayah continuation (same paradigm as P3), not the next ayah.
    const isEndSimilarityOnly = !endOnly && lcp === 0 && endMatchLen >= 2;
    const isEndOnly = endOnly || isEndSimilarityOnly;
    if (isEndOnly) {
      const nextAnchor = txt(anchorRef.surah, anchorRef.ayah + 1);
      if (nextAnchor) {
        const distractorOpts = [];
        const seen = new Set([`${anchorRef.surah}:${anchorRef.ayah + 1}`]);
        let anyMidAyah = false; // track if any distractor continues mid-ayah

        otherRefs.forEach(r => {
          const dText = txt(r.surah, r.ayah);
          if (!dText) return;
          const wD = dText.trim().split(/\s+/);
          const nD = wD.map(normalizeForMatch);

          let optText = '';
          let optAyah = r.ayah;
          let isNext = false;

          if (endOnly) {
            // Explicit next-verse entry (\n flag): all distractors use their next ayah
            optText = txt(r.surah, r.ayah + 1);
            optAyah = r.ayah + 1;
            isNext = true;
          } else {
            // End-similarity: find how many words from the end of anchor also appear at the
            // end of distractor (shared suffix).
            let dEndMatch = 0;
            while (
              dEndMatch < nA.length && dEndMatch < nD.length &&
              nA[nA.length - 1 - dEndMatch] === nD[nD.length - 1 - dEndMatch]
            ) dEndMatch++;

            // sharedStartInD: position in distractor where the shared suffix begins
            const sharedStartInD = nD.length - dEndMatch;

            if (sharedStartInD > 0) {
              // Distractor has words BEFORE the shared ending block.
              // anchor ends exactly at the shared block (it has no words after it).
              // The distractor ALSO ends at the shared block (the shared block goes to end of wD).
              // So the correct continuation for THIS distractor is also its next ayah.
              optText = txt(r.surah, r.ayah + 1);
              optAyah = r.ayah + 1;
              isNext = true;
            } else {
              // Distractor's verse IS fully the shared ending, or shorter — use next ayah
              optText = txt(r.surah, r.ayah + 1);
              optAyah = r.ayah + 1;
              isNext = true;
            }
          }

          const key = `${r.surah}:${optAyah}`;
          if (optText && optText.trim() !== anchorText.trim() && !seen.has(key) && distractorOpts.length < 3) {
            seen.add(key);
            if (!isNext) anyMidAyah = true;
            distractorOpts.push({
              surah: r.surah,
              ayah: optAyah,
              surahName: nam(r.surah),
              text: optText,
              fullText: optText,
              isCorrect: false,
              isNext,
            });
          }
        });

        if (distractorOpts.length > 0) {
          const isSameSurahIdentical = nA.join(' ') === nO.join(' ') && otherRefs.some(r => r.surah === anchorRef.surah);
          let question = `Which verse follows in ${nam(surahNum)}?`;
          const options = [{
            surah: anchorRef.surah,
            ayah: anchorRef.ayah + 1,
            surahName: nam(anchorRef.surah),
            text: nextAnchor,
            fullText: nextAnchor,
            isCorrect: true,
            isNext: true,
          }, ...distractorOpts];

          if (isSameSurahIdentical) {
            question = `Which following verse comes first in ${nam(surahNum)}?`;
            let minIdx = 0;
            for (let i = 1; i < options.length; i++) {
              if (options[i].surah < options[minIdx].surah ||
                  (options[i].surah === options[minIdx].surah && options[i].ayah < options[minIdx].ayah)) {
                minIdx = i;
              }
            }
            options.forEach(o => { o.isCorrect = false; });
            options[minIdx].isCorrect = true;
          }

          cards.push({
            id: `next-${anchorRef.surah}:${anchorRef.ayah}-${entryIdx}`,
            stem: anchorText,
            contextVerse: {
              surah: anchorRef.surah,
              ayah: anchorRef.ayah,
              text: anchorText,
              surahName: nam(surahNum),
            },
            question,
            options,
            splitType: 'nextVerse',
          });
          return;
        }
      }
    }

    // Paradigm 2: Common Prefix Continuation
    if (lcp >= 1 && lcp < wA.length) {
      const stem = wA.slice(0, lcp).join(' ') + ' ...';
      const splitA = lcp;
      const correctOpt = {
        surah: anchorRef.surah,
        ayah: anchorRef.ayah,
        surahName: nam(anchorRef.surah),
        text: wA.slice(splitA).join(' '),
        fullText: anchorText,
        isCorrect: true,
      };

      const distractorOpts = [];
      const seen = new Set([correctOpt.text]);

      otherRefs.forEach(ref => {
        const dText = txt(ref.surah, ref.ayah);
        if (!dText) return;
        const wD = dText.trim().split(/\s+/);
        const nD = wD.map(normalizeForMatch);

        const aligned = alignDistractor(nA, wA, splitA, nD, wD, ref, txt);
        if (aligned && aligned.text && !seen.has(aligned.text) && distractorOpts.length < 3) {
          seen.add(aligned.text);
          distractorOpts.push({
            surah: ref.surah,
            ayah: aligned.ayah,
            surahName: nam(ref.surah),
            text: aligned.text,
            fullText: dText,
            isCorrect: false,
          });
        }
      });

      if (distractorOpts.length > 0) {
        let isLcpSameSurah = otherRefs.some(r => r.surah === anchorRef.surah && distractorOpts.some(d => d.surah === anchorRef.surah));
        let question = `Which continuation follows in ${nam(surahNum)}?`;
        const options = [correctOpt, ...distractorOpts];

        if (isLcpSameSurah) {
          question = `Which continuation comes first in ${nam(surahNum)}?`;
          let minIdx = 0;
          for (let i = 1; i < options.length; i++) {
            if (options[i].surah < options[minIdx].surah ||
                (options[i].surah === options[minIdx].surah && options[i].ayah < options[minIdx].ayah)) {
              minIdx = i;
            }
          }
          options.forEach(o => { o.isCorrect = false; });
          options[minIdx].isCorrect = true;
        }

        cards.push({
          id: `cont-${anchorRef.surah}:${anchorRef.ayah}-${entryIdx}`,
          stem,
          contextVerse: {
            surah: anchorRef.surah,
            ayah: anchorRef.ayah,
            text: stem,
            surahName: nam(surahNum),
          },
          question,
          options,
          splitType: 'continuation',
        });
        return;
      }
    }

    // Paradigm 3: Middle Substring Match inside Verses
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
      const anchorIsNext = endA >= wA.length;
      const correctText = anchorIsNext ? txt(anchorRef.surah, anchorRef.ayah + 1) : wA.slice(endA).join(' ');
      const correctAyah = anchorIsNext ? anchorRef.ayah + 1 : anchorRef.ayah;

      if (correctText) {
        const correctOpt = {
          surah: anchorRef.surah,
          ayah: correctAyah,
          surahName: nam(anchorRef.surah),
          text: correctText,
          fullText: txt(anchorRef.surah, correctAyah),
          isCorrect: true,
          isNext: anchorIsNext,
        };

        const distractorOpts = [];
        const seen = new Set([correctOpt.text]);

        otherRefs.forEach(ref => {
          const dText = txt(ref.surah, ref.ayah);
          if (!dText) return;
          const wD = dText.trim().split(/\s+/);
          const nD = wD.map(normalizeForMatch);

          let dLen = 0, dBestD = 0;
          for (let i = 0; i < nA.length; i++) {
            for (let j = 0; j < nD.length; j++) {
              let len = 0;
              while (i + len < nA.length && j + len < nD.length && nA[i + len] === nD[j + len]) len++;
              if (len > dLen) { dLen = len; dBestD = j; }
            }
          }

          if (dLen >= 2) {
            const cutD = dBestD + dLen;
            let optText = '';
            let optAyah = ref.ayah;
            let isNext = false;

            if (cutD < wD.length) {
              // Distractor continues in the SAME ayah
              optText = wD.slice(cutD).join(' ');
              optAyah = ref.ayah;
              isNext = false;
            } else {
              // Distractor verse ended at the shared block -> use NEXT ayah
              optText = txt(ref.surah, ref.ayah + 1);
              optAyah = ref.ayah + 1;
              isNext = true;
            }

            if (optText && optText.trim() !== anchorText.trim() && !seen.has(optText) && distractorOpts.length < 3) {
              seen.add(optText);
              distractorOpts.push({
                surah: ref.surah,
                ayah: optAyah,
                surahName: nam(ref.surah),
                text: optText,
                fullText: txt(ref.surah, optAyah),
                isCorrect: false,
                isNext,
              });
            }
          }
        });

        if (distractorOpts.length > 0) {
          const allNext = anchorIsNext && distractorOpts.every(d => d.isNext);
          const isSameSurah = otherRefs.some(r => r.surah === anchorRef.surah);
          const isSameSurahIdentical = isSameSurah && nA.join(' ') === nO.join(' ');

          let question = '';
          let splitType = '';

          if (allNext) {
            splitType = 'nextVerse';
            question = isSameSurahIdentical
              ? `Which following verse comes first in ${nam(surahNum)}?`
              : `Which verse follows in ${nam(surahNum)}?`;
          } else {
            splitType = 'continuation';
            question = isSameSurah
              ? `Which continuation comes first in ${nam(surahNum)}?`
              : `Which continuation follows in ${nam(surahNum)}?`;
          }

          const stem = allNext
            ? anchorText
            : (wA.slice(0, endA).join(' ') + (endA < wA.length ? ' ...' : ''));

          const options = [correctOpt, ...distractorOpts];

          if (isSameSurahIdentical || (isSameSurah && allNext)) {
            let minIdx = 0;
            for (let i = 1; i < options.length; i++) {
              if (options[i].surah < options[minIdx].surah ||
                  (options[i].surah === options[minIdx].surah && options[i].ayah < options[minIdx].ayah)) {
                minIdx = i;
              }
            }
            options.forEach(o => { o.isCorrect = false; });
            options[minIdx].isCorrect = true;
          }

          cards.push({
            id: `${splitType}-${anchorRef.surah}:${anchorRef.ayah}-${entryIdx}`,
            stem,
            contextVerse: {
              surah: anchorRef.surah,
              ayah: anchorRef.ayah,
              text: stem,
              surahName: nam(surahNum),
            },
            question,
            options,
            splitType,
          });
          return;
        }
      }
    }
  });

  // Deduplicate cards by surah, stem, question, and options set
  // This prevents short-stem collisions (different mutashabihat sharing a short prefix like "وَإِذْ ..."),
  // while safely consolidating identical-stem same-surah duplicates (like 2:47 and 2:122).
  const mergedMap = new Map();
  cards.forEach(card => {
    const optKey = card.options.map(o => `${o.surah}:${o.ayah}`).sort().join(',');
    const key = `${card.contextVerse.surah}:${card.stem}-${optKey}-${card.question}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, card);
    }
  });

  const finalCards = Array.from(mergedMap.values()).map(c => ({
    ...c,
    options: shuffle(c.options),
  }));

  return shuffle(finalCards);
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
