import { useMemo } from 'react';
import { computeActiveVerseIndex } from '../../../utils/verseProgress';
import { removeTashkeel, normalizeArabic, expandMuqattaat, BISMILLAH_SIMPLE, hasBismillahHeader } from '../../../utils/quranUtils';

export const useActiveVerseIndex = (
  enableErrorDetection,
  liveResults,
  chunks,
  currentChunkIndex,
  retryStartIndex,
  quranSimple,
  targetAccuracy
) => {
  return useMemo(() => {
    let sliceActiveAyahIndex = 0;
    if (enableErrorDetection && liveResults && liveResults.verseStats) {
      sliceActiveAyahIndex = computeActiveVerseIndex(liveResults.verseStats, targetAccuracy);
    }
    
    const activeAyahIndex = retryStartIndex + sliceActiveAyahIndex;
    
    let activeVerseWordOffset = 0;
    if (enableErrorDetection && liveResults && liveResults.verseStats && chunks[currentChunkIndex]) {
      const sliceActiveIdx = activeAyahIndex - retryStartIndex;
      const sliceChunk = chunks[currentChunkIndex].slice(retryStartIndex);
      for (let i = 0; i < sliceActiveIdx; i++) {
        const ayah = sliceChunk[i];
        if (!ayah) continue;
        let txt = ayah.text || '';
        if (quranSimple) {
          const key = `${ayah.surahNumber}|${ayah.numberInSurah}`;
          if (quranSimple[key]) txt = quranSimple[key];
        }
        let combined;
        if (hasBismillahHeader(ayah.surahNumber, ayah.numberInSurah)) {
          const bodyText = txt.startsWith(BISMILLAH_SIMPLE)
            ? txt.slice(BISMILLAH_SIMPLE.length).trim()
            : txt;
          combined = normalizeArabic(BISMILLAH_SIMPLE) + ' ' + normalizeArabic(expandMuqattaat(removeTashkeel(bodyText)));
        } else {
          combined = normalizeArabic(expandMuqattaat(removeTashkeel(txt)));
        }
        activeVerseWordOffset += combined.trim().split(/\s+/).filter(Boolean).length;
      }
    }

    const activeStat = liveResults?.verseStats?.[sliceActiveAyahIndex];
    const allWordsAttempted = !!(enableErrorDetection && activeStat && !activeStat.hasPending);
    const criteriaFailed = allWordsAttempted && activeStat && activeStat.accuracy < targetAccuracy;

    return {
      sliceActiveAyahIndex,
      activeAyahIndex,
      activeVerseWordOffset,
      activeStat,
      allWordsAttempted,
      criteriaFailed
    };
  }, [enableErrorDetection, liveResults, chunks, currentChunkIndex, retryStartIndex, quranSimple, targetAccuracy]);
};
