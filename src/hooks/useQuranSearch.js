/**
 * useQuranSearch.js
 *
 * Full-Quran search over the data already bundled with the app
 * (quran-ar.json + quran-en.json + surahs.json). Fully offline — no
 * network, no server, no extra data loading.
 *
 * ── Design notes ────────────────────────────────────────────────────────────
 * 1. The Quran text is already resident in memory via useQuranData(). We never
 *    load or copy the raw datasets again; we only build a *derived* normalized
 *    index (lazily, once) so that Arabic diacritics/tashkeel and letter
 *    variants don't defeat a literal substring match.
 *
 * 2. The derived index is cached at module scope keyed by the identity of the
 *    quranAr object, so it survives SurahList unmount/remount and is built at
 *    most once per app session.
 *
 * 3. Normalization reuses the app's existing normalizeArabic() from
 *    quranUtils.js — the exact same routine used by the recitation engine, so
 *    search matches what the Mudarasa session considers "the same word".
 *    The stored Quran text itself is never modified.
 *
 * 4. An Arabic query is matched against Arabic text only, an English query
 *    against the translation only. This is both faster and avoids nonsense
 *    cross-language hits.
 */

import { useDeferredValue, useMemo } from 'react';
import { normalizeArabic } from '../utils/quranUtils';

/** Hard cap on ayah results rendered — keeps the DOM small for very broad queries. */
const MAX_AYAH_RESULTS = 120;

/** Words of context kept either side of the first match in an ayah snippet. */
const SNIPPET_RADIUS = 7;

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** True if the query contains any Arabic character. */
export const isArabicQuery = (q) => ARABIC_RE.test(q || '');

/** Latin normalization: lowercase + collapse whitespace + straighten quotes. */
const normalizeLatin = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Normalize a search term the same way its target corpus was normalized.
 */
const normalizeTerm = (term, arabic) => (arabic ? normalizeArabic(term) : normalizeLatin(term));

// ── Module-level derived index cache ─────────────────────────────────────────
let _cache = { src: null, ar: null, en: null, surahOf: null, ayahOf: null };

/**
 * Build (or reuse) the flattened, normalized ayah index.
 *  - ar[i]        normalized Arabic text of global ayah i
 *  - en[i]        normalized English translation of global ayah i
 *  - surahOf[i]   surah number (1..114)
 *  - ayahOf[i]    ayah number within that surah
 */
const getAyahIndex = (quranAr, quranEn) => {
  if (_cache.src === quranAr && _cache.ar) return _cache;
  if (!quranAr || !Array.isArray(quranAr.surahs)) {
    return { src: null, ar: null, en: null, surahOf: null, ayahOf: null };
  }

  let total = 0;
  for (let s = 0; s < quranAr.surahs.length; s++) {
    total += quranAr.surahs[s]?.ayahs?.length || 0;
  }

  const ar = new Array(total);
  const en = new Array(total);
  const surahOf = new Int32Array(total);
  const ayahOf = new Int32Array(total);

  let i = 0;
  for (let s = 0; s < quranAr.surahs.length; s++) {
    const arAyahs = quranAr.surahs[s]?.ayahs || [];
    const enAyahs = quranEn?.surahs?.[s]?.ayahs || [];
    for (let a = 0; a < arAyahs.length; a++) {
      ar[i] = normalizeArabic(arAyahs[a]?.text || '');
      en[i] = normalizeLatin(enAyahs[a]?.text || '');
      surahOf[i] = s + 1;
      ayahOf[i] = a + 1;
      i++;
    }
  }

  _cache = { src: quranAr, ar, en, surahOf, ayahOf };
  return _cache;
};

/**
 * Build display segments from an ayah's *original* text, flagging the words
 * that match. Works on words rather than character offsets so the original
 * diacritics and punctuation are preserved exactly as stored.
 */
const buildSegments = (text, terms, arabic) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let firstMatch = -1;

  const segments = words.map((word, idx) => {
    const probe = arabic ? normalizeArabic(word) : normalizeLatin(word);
    const match = terms.some((t) => probe.includes(t));
    if (match && firstMatch === -1) firstMatch = idx;
    return { text: word, match };
  });

  const totalWords = segments.length;
  if (firstMatch === -1) return { segments, clippedStart: false, clippedEnd: false };

  const from = Math.max(0, firstMatch - SNIPPET_RADIUS);
  const to = Math.min(segments.length, firstMatch + SNIPPET_RADIUS + 1);
  return {
    segments: segments.slice(from, to),
    clippedStart: from > 0,
    clippedEnd: to < totalWords,
  };
};

/**
 * Full-Quran search.
 *
 * @param {string} query
 * @param {Object} params
 * @param {Object} params.quranAr  normalized `{ surahs: [...] }` from useQuranData
 * @param {Object} params.quranEn  same shape, translation edition
 * @param {Array}  params.surahs   surah metadata list
 * @returns {{ query, isSearching, hasQuery, surahResults, ayahResults,
 *             totalAyahMatches, isTruncated }}
 */
export const useQuranSearch = (query, { quranAr, quranEn, surahs } = {}) => {
  const rawQuery = useDeferredValue(query || '');
  const arabic = useMemo(() => isArabicQuery(rawQuery), [rawQuery]);
  const terms = useMemo(
    () => normalizeTerm(rawQuery, arabic).split(' ').filter(Boolean),
    [rawQuery, arabic]
  );

  const normalizedSurahs = useMemo(() => {
    if (!Array.isArray(surahs)) return [];
    return surahs.map((s) => ({
      surah: s,
      nameAr: normalizeArabic(s.name || ''),
      nameEn: normalizeLatin(s.englishName || ''),
      meaningEn: normalizeLatin(s.englishNameTranslation || ''),
    }));
  }, [surahs]);

  const { surahResults, ayahResults, totalAyahMatches } = useMemo(() => {
    if (!rawQuery.trim() || terms.length === 0 || !normalizedSurahs.length) {
      return { surahResults: [], ayahResults: [], totalAyahMatches: 0 };
    }

    // ── 1. Surah / chapter name matches ──────────────────────────────────────
    const surahResults = normalizedSurahs
      .filter((s) => terms.some((t) => s.nameAr.includes(t) || s.nameEn.includes(t) || s.meaningEn.includes(t)))
      .map((s) => s.surah);

    // ── 2. Ayah / content matches (Arabic text OR English translation) ──────
    const idx = getAyahIndex(quranAr, quranEn);
    const ayahResults = [];
    let totalAyahMatches = 0;

    if (idx.ar) {
      const corpus = arabic ? idx.ar : idx.en;
      const total = corpus.length;

      for (let i = 0; i < total; i++) {
        const text = corpus[i];
        // Require *every* term to appear somewhere in this ayah (AND semantics),
        // which keeps multi-word queries meaningful.
        let all = true;
        for (let t = 0; t < terms.length; t++) {
          if (!text.includes(terms[t])) {
            all = false;
            break;
          }
        }
        if (!all) continue;

        totalAyahMatches++;

        if (ayahResults.length < MAX_AYAH_RESULTS) {
          const surahNumber = idx.surahOf[i];
          const ayahNumber = idx.ayahOf[i];
          const arText = quranAr.surahs[surahNumber - 1].ayahs[ayahNumber - 1]?.text || '';
          const enText = quranEn?.surahs?.[surahNumber - 1]?.ayahs?.[ayahNumber - 1]?.text || '';

          ayahResults.push({
            surahNumber,
            ayahNumber,
            arabic: buildSegments(arText, terms, true),
            english: buildSegments(enText, terms, false),
          });
        }
      }
    }

    return { surahResults, ayahResults, totalAyahMatches };
  }, [rawQuery, terms, arabic, quranAr, quranEn, normalizedSurahs]);

  return {
    query: rawQuery,
    isSearching: rawQuery.trim().length > 0,
    hasQuery: terms.length > 0,
    surahResults,
    ayahResults,
    totalAyahMatches,
    isTruncated: totalAyahMatches > ayahResults.length,
  };
};

export default useQuranSearch;