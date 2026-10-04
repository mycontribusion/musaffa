import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioUrl } from '../utils/quranUtils';

export const useMusaffa = (quranAr, musaffaParams, setPartnerSubView, reciter = 'ar.alafasy') => {
  const [chunks, setChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentAyahNumber, setCurrentAyahNumber] = useState(null);
  const [mudarasaTurn, setMudarasaTurn] = useState('app');
  const [isPaused, setIsPaused] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef(null);
  const nextAudioRef = useRef(null);
  const currentIndexRef = useRef(0);
  const wakeLockRef = useRef(null);
  const isPlayingRef = useRef(false);
  /** A Musaffa session is running — independent of whose turn it is. */
  const sessionActiveRef = useRef(false);
  /** True while a `playCurrentIndex` loop is in flight. Guards against two
      concurrent loops sharing the same two audio elements. */
  const playLoopActiveRef = useRef(false);
  /** The user explicitly paused, so the screen is allowed to sleep. */
  const isPausedRef = useRef(false);
  const shouldStopRef = useRef(false);
  const pausedAyahIndexRef = useRef(0); // Track which ayah we paused at

  // Initialise audio objects lazily so they aren't created during SSR
  const getAudio = (ref) => {
    if (!ref.current) ref.current = new Audio();
    return ref.current;
  };

  // ── Wake Lock ────────────────────────────────────────────────────────────
  /**
   * Fire-and-forget on purpose.
   *
   * Awaiting this consumed the user-gesture token and made Safari block the
   * first audio of the session. It is idempotent instead: a live sentinel is
   * left alone, a released one is replaced. That `released` check matters
   * because the browser silently drops the lock whenever the page is hidden,
   * and a stale non-null ref would otherwise make us believe we still hold it.
   */
  const acquireWakeLock = () => {
    try {
      if (!('wakeLock' in navigator)) return;
      const held = wakeLockRef.current;
      if (held && !held.released) return;
      navigator.wakeLock.request('screen')
        .then((sentinel) => {
          wakeLockRef.current = sentinel;
          // Clearing the ref on release is what lets the visibility handler
          // take a fresh lock instead of no-op'ing against a dead sentinel.
          sentinel.addEventListener?.('release', () => {
            if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
          });
        })
        .catch((e) => { console.warn('Wake Lock unavailable:', e); });
    } catch (e) { console.warn('Wake Lock unavailable:', e); }
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  /**
   * Keep the screen on for the whole session — including the user's turn.
   *
   * A screen wake lock is released by the browser every time the page goes
   * hidden (screen off, tab switch, device lock), so surviving a sleep depends
   * entirely on re-requesting it when the page becomes visible again.
   *
   * The previous guard was
   *   `visible && mudarasaTurn === 'app' && isPlayingRef.current`
   * which was self-defeating: `playCurrentIndex` sets `isPlayingRef.current =
   * false` and hands the turn to `'user'` the instant the app finishes
   * reading, yet the code deliberately keeps the lock across that handover
   * ("keep screen on during user's recitation turn"). So once the lock was
   * dropped it was never restored during the longest part of the session —
   * the user reciting — and the display went to sleep.
   *
   * `sessionActiveRef` / `isPausedRef` capture the state that actually matters:
   * is a session running, and has the user paused it. Using refs also lets
   * this subscribe once instead of re-binding on every turn change.
   */
  useEffect(() => {
    const reAcquire = () => {
      if (document.visibilityState !== 'visible') return;
      if (!sessionActiveRef.current || isPausedRef.current) return;
      acquireWakeLock();
    };
    document.addEventListener('visibilitychange', reAcquire);
    // bfcache restores and tab re-focus do not always emit visibilitychange.
    window.addEventListener('pageshow', reAcquire);
    window.addEventListener('focus', reAcquire);
    return () => {
      document.removeEventListener('visibilitychange', reAcquire);
      window.removeEventListener('pageshow', reAcquire);
      window.removeEventListener('focus', reAcquire);
    };
  }, []);

  const createChunks = (params = musaffaParams) => {
    const { startSurah, startAyah, endSurah, endAyah, portion } = params;
    let allAyahsInRange = [];
    for (let s = startSurah; s <= endSurah; s++) {
      const surahAyahs = quranAr.surahs[s - 1].ayahs;
      let startIdx = (s === startSurah) ? startAyah - 1 : 0;
      let endIdx = (s === endSurah) ? endAyah : surahAyahs.length;
      allAyahsInRange = [...allAyahsInRange, ...surahAyahs.slice(startIdx, endIdx).map(a => ({ ...a, surahNumber: s }))];
    }
    if (allAyahsInRange.length === 0) return [];

    const newChunks = []; let currentChunk = [];

    if (portion === 'verse') {
      allAyahsInRange.forEach(a => newChunks.push([a]));
    } else if (portion === 'page') {
      let lastPage = allAyahsInRange[0].page;
      allAyahsInRange.forEach(a => {
        if (a.page !== lastPage) { newChunks.push(currentChunk); currentChunk = []; lastPage = a.page; }
        currentChunk.push(a);
      });
    } else if (portion === 'half' || portion === 'third') {
      let pageGroups = {};
      allAyahsInRange.forEach(a => { if (!pageGroups[a.page]) pageGroups[a.page] = []; pageGroups[a.page].push(a); });
      Object.values(pageGroups).forEach(group => {
        const parts = portion === 'half' ? 2 : 3;
        for (let i = 0; i < parts; i++) {
          const start = Math.ceil(i * group.length / parts);
          const end = Math.ceil((i + 1) * group.length / parts);
          const part = group.slice(start, end);
          if (part.length > 0) newChunks.push(part);
        }
      });
    } else if (portion === 'rubu') {
      let lastRubu = allAyahsInRange[0].hizbQuarter;
      allAyahsInRange.forEach(a => {
        if (a.hizbQuarter !== lastRubu) { newChunks.push(currentChunk); currentChunk = []; lastRubu = a.hizbQuarter; }
        currentChunk.push(a);
      });
    } else if (portion === 'hizb') {
      let lastHizb = Math.ceil(allAyahsInRange[0].hizbQuarter / 2);
      allAyahsInRange.forEach(a => {
        const currentHizb = Math.ceil(a.hizbQuarter / 2);
        if (currentHizb !== lastHizb) { newChunks.push(currentChunk); currentChunk = []; lastHizb = currentHizb; }
        currentChunk.push(a);
      });
    }

    if (currentChunk.length) newChunks.push(currentChunk);
    const finalChunks = newChunks.filter(c => c.length > 0);
    setChunks(finalChunks);
    return finalChunks;
  };

  /**
   * Play one ayah; resolves when it finishes.
   *
   * This is the only place a recitation can halt on its own, so it is the
   * place that had three defects which showed up as "the session paused for no
   * reason":
   *
   *  1. **No retries.** These files come from public CDNs, and a single 404 or
   *     timeout on one ayah used to reject straight into the `catch` in
   *     `playCurrentIndex`, which stops the entire recitation. Transient
   *     failures are now retried twice with a backoff before giving up.
   *  2. **Leaked handlers.** `audioRef`/`nextAudioRef` are two long-lived
   *     elements reused across every ayah. `onended`/`onerror` were never
   *     detached, so an event from an interrupted preload — or from a `src`
   *     reassignment done by us — could reject whichever attempt was current.
   *     Handlers are now detached the moment a promise settles.
   *  3. **`AbortError` treated as failure.** `play()` rejects with
   *     `AbortError` whenever the `src` is replaced or the element is paused —
   *     including the user tapping Pause and the preload/swap dance below.
   *     That surfaced a spurious "audio error" plus a paused state. It is now
   *     flagged `silent` so the caller can exit quietly without touching
   *     `audioError`.
   *
   * Assigning `src` only when it actually changed also avoids reloading the
   * element unnecessarily (setting `src` to the current value still resets it).
   */
  const playAyahAudioAsync = (ayah, attempt = 0) => {
    return new Promise((resolve, reject) => {
      const audio = getAudio(audioRef);
      const nextAudio = getAudio(nextAudioRef);
      const url = getAudioUrl(ayah.number, reciter, ayah.surahNumber, ayah.numberInSurah);

      // Consume the preloaded audio ONLY if it perfectly matches the request,
      // and only on the first attempt — a retry has to re-fetch.
      let el;
      if (attempt === 0 && nextAudio.src === url) {
        el = nextAudio;
        nextAudioRef.current = audio;
        audioRef.current = el;
      } else {
        el = audio;
      }

      let settled = false;

      const cleanup = () => {
        el.onended = null;
        el.onerror = null;
      };

      const settle = (fn, arg) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(arg);
      };

      const failWith = (err) => {
        // Our own doing: the src was swapped, or the user paused/stopped.
        if (err && err.name === 'AbortError') {
          // Guard the assignment — `play()` hands back a DOMException, but a
          // primitive rejection would throw here under strict mode.
          if (typeof err === 'object') err.silent = true;
          settle(reject, err);
          return;
        }
        if (attempt < 2) {
          settled = true;
          cleanup();
          setTimeout(() => {
            // Do not resurrect playback the user already stopped.
            if (shouldStopRef.current) return;
            playAyahAudioAsync(ayah, attempt + 1).then(resolve, reject);
          }, 500 * (attempt + 1));
          return;
        }
        console.warn(`Audio failed after ${attempt + 1} attempts:`, url, err);
        settle(reject, err instanceof Error ? err : new Error('Audio playback failed'));
      };

      if (el.src !== url) el.src = url;
      el.onended = () => settle(resolve, undefined);
      el.onerror = () => failWith(new Error('Audio playback failed'));
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => failWith(err));
      }
    });
  };

  const playCurrentIndex = async (currentChunks = chunks, startFromAyahIndex = 0, force = false) => {
    if (currentChunks.length === 0) return;

    // Hands-free can fire this twice for one portion. `useMic` calls
    // `onSilence` straight from its requestAnimationFrame loop, and a second
    // 3.5s-silence window can be detected before React has re-rendered with the
    // new turn, leaving `onSilenceRef.current` stale. Without this guard the
    // second call started a *second* play loop over the same two `Audio`
    // elements: both loops reassigned `src` and overwrote each other's
    // `onended`, so the first loop's promise never settled and playback stalled
    // — which surfaced as a session paused on the app's turn that only a manual
    // Resume could clear.
    //
    // `force` is for explicit user intent (Resume), where the previous loop is
    // legitimately parked mid-await after a Pause and must be replaced.
    if (playLoopActiveRef.current && !force) return;
    playLoopActiveRef.current = true;

    isPlayingRef.current = true;
    shouldStopRef.current = false;
    // Keep screen on for the full session (both app-reading and user-reciting)
    // DO NOT await this, otherwise the user-gesture token expires and Safari blocks the first audio!
    acquireWakeLock();

    let idx = currentIndexRef.current % currentChunks.length;
    setMudarasaTurn('app');
    const chunk = currentChunks[idx];

    // Start from the specified ayah index (for resume)
    for (let i = startFromAyahIndex; i < chunk.length; i++) {
      // Check if we should stop
      if (shouldStopRef.current) {
        // Save the current ayah index for resume
        pausedAyahIndexRef.current = i;
        setCurrentAyahNumber(null);
        isPlayingRef.current = false;
        playLoopActiveRef.current = false;
        return;
      }
      
      const ayah = chunk[i];

      // Play Bismillah for the start of any Surah (except Fatiha and Tawbah)
      if (ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
        // Preload the actual first verse while Bismillah is playing
        const na = getAudio(nextAudioRef);
        na.src = getAudioUrl(ayah.number, reciter, ayah.surahNumber, ayah.numberInSurah);
        na.load();
        
        try {
          setCurrentAyahNumber('bismillah-' + ayah.number);
          // Play Bismillah (Ayah 1 of Surah 1)
          await playAyahAudioAsync({ number: 1, surahNumber: 1, numberInSurah: 1 });
        } catch {
          console.warn('Failed to play Bismillah, skipping...');
        }
      }

      setCurrentAyahNumber(ayah.number);

      // Preload next ayah
      const nextAyah = chunk[i + 1];
      if (nextAyah) {
        const na = getAudio(nextAudioRef);
        na.src = getAudioUrl(nextAyah.number, reciter, nextAyah.surahNumber, nextAyah.numberInSurah);
        na.load();
      }

      try {
        await playAyahAudioAsync(ayah);
      } catch (err) {
        pausedAyahIndexRef.current = i;

        if (err && err.silent) {
          // Interrupted by us or by the user (Pause, stop, src swap). The pause
          // state is already correct, so leave it alone — reporting an audio
          // error here is what made manual pauses look like failures.
          isPlayingRef.current = false;
          setCurrentAyahNumber(null);
          playLoopActiveRef.current = false;
          return;
        }

        // Genuine failure: pause the session and expose the error state.
        setAudioError(true);
        setCurrentAyahNumber(null);
        isPlayingRef.current = false;
        playLoopActiveRef.current = false;
        
        // Manual pause logic to prevent stale state issues
        if (audioRef.current) audioRef.current.pause();
        if (nextAudioRef.current) nextAudioRef.current.pause();
        releaseWakeLock();
        isPausedRef.current = true;
        setIsPaused(true);
        return;
      }
    }

    setCurrentAyahNumber(null);
    isPlayingRef.current = false;
    playLoopActiveRef.current = false;
    // Do NOT release wake lock here — keep screen on during user's recitation turn

    const nextIdx = (idx + 1) % currentChunks.length;
    currentIndexRef.current = nextIdx;
    setCurrentChunkIndex(nextIdx);
    setMudarasaTurn('user');
  };

  const startMusaffa = (overrideChunks, startChunkIndex = 0, initialTurn, overrideParams) => {
    // Attempt to unlock audio elements for Safari/Chrome autoplay policy
    try {
      const a1 = getAudio(audioRef);
      const a2 = getAudio(nextAudioRef);
      // Small silent wav to safely unlock play
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      if (!a1.src) a1.src = silentWav;
      if (!a2.src) a2.src = silentWav;
      a1.play().then(() => a1.pause()).catch(() => {});
      a2.play().then(() => a2.pause()).catch(() => {});
    } catch {
      // Audio already unlocked or unavailable; playback retries handle failures.
    }

    // If overrideParams is provided, use it to create chunks; otherwise use overrideChunks or createChunks()
    let finalChunks;
    if (overrideParams) {
      finalChunks = createChunks(overrideParams);
    } else {
      finalChunks = Array.isArray(overrideChunks) ? overrideChunks : createChunks();
    }
    if (finalChunks.length === 0) return;
    currentIndexRef.current = startChunkIndex;
    setCurrentChunkIndex(startChunkIndex);
    pausedAyahIndexRef.current = 0; // Reset pause position for new session
    // From here on the screen must stay on for the whole session, whichever
    // turn it is — this is what the visibility handler checks before
    // re-requesting the lock after a sleep.
    sessionActiveRef.current = true;
    isPausedRef.current = false;
    // A new session supersedes any loop left parked by a previous one (e.g. the
    // user paused, went back to config and started again). Without this the
    // guard in `playCurrentIndex` would refuse to begin.
    playLoopActiveRef.current = false;
    setPartnerSubView('mudarasa');
    // If initialTurn is provided (for resume), use it; otherwise check whoStarts
    if (initialTurn) {
      setMudarasaTurn(initialTurn);
      if (initialTurn === 'app') {
        playCurrentIndex(finalChunks);
      } else {
        acquireWakeLock(); // Keep screen on even when user starts
      }
    } else if (musaffaParams.whoStarts === 'app') {
      playCurrentIndex(finalChunks);
    } else {
      acquireWakeLock(); // Keep screen on even when user starts
      setMudarasaTurn('user');
    }
  };

  const handleNextTurnManual = () => {
    if (chunks.length === 0) return;

    // Reject a spurious advance. `isPlayingRef.current` is true for the whole
    // time the app is reading and false during the user's turn, so a silence
    // trigger that arrives while audio is playing cannot be a legitimate
    // "I'm done" signal — it is `useMic`'s rAF loop firing on a stale
    // `onSilenceRef` before React has re-rendered the new turn. Advancing there
    // started a competing play loop and stalled the app's turn.
    if (isPlayingRef.current) return;

    if (window.navigator.vibrate) window.navigator.vibrate([40, 150]);
    
    // The user just finished their turn on the current chunk. 
    // Advance to the NEXT chunk before the app plays!
    const nextIdx = (currentIndexRef.current + 1) % chunks.length;
    currentIndexRef.current = nextIdx;
    setCurrentChunkIndex(nextIdx);
    
    // ---- NEW: Preload first ayah of the upcoming chunk ----
    const nextChunk = chunks[nextIdx];
    if (nextChunk && nextChunk.length > 0) {
      const firstAyah = nextChunk[0];
      const preAudio = getAudio(nextAudioRef);
      preAudio.src = getAudioUrl(firstAyah.number, reciter, firstAyah.surahNumber, firstAyah.numberInSurah);
      preAudio.load(); // start downloading immediately
    }
    // -----------------------------------------------------
    
    // Pass chunks explicitly to avoid stale closure
    playCurrentIndex(chunks);
  };

  // Pause musaffa - stop audio and release wake lock
  const pauseMusaffa = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
    }
    releaseWakeLock();
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  // Resume musaffa - re-acquire wake lock and continue playback from where it was paused
  const resumeMusaffa = useCallback(() => {
    setAudioError(false);
    isPausedRef.current = false;
    acquireWakeLock();
    setIsPaused(false);
    // Resume playback if we were in the middle of app playback.
    // `force` because after a Pause the previous loop is still parked on a
    // promise that can never settle — this Resume must be allowed to replace it.
    if (mudarasaTurn === 'app' && chunks.length > 0) {
      playCurrentIndex(chunks, pausedAyahIndexRef.current, true);
    }
  }, [chunks, mudarasaTurn]);

  // Stop musaffa - stop audio, release wake lock, and reset paused state
  const stopMusaffa = useCallback(() => {
    // Signal to stop the playback loop
    shouldStopRef.current = true;
    playLoopActiveRef.current = false;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current.pause();
      nextAudioRef.current.src = '';
      nextAudioRef.current.onended = null;
      nextAudioRef.current.onerror = null;
    }
    releaseWakeLock();
    isPlayingRef.current = false;
    sessionActiveRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    setAudioError(false);
  }, []);

  // Cleanup on unmount — stop audio and release screen lock
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (nextAudioRef.current) { nextAudioRef.current.pause(); nextAudioRef.current.src = ''; }
      releaseWakeLock();
    };
  }, []);

  return {
    chunks, currentChunkIndex, currentAyahNumber, mudarasaTurn, isPaused, audioError, setAudioError,
    startMusaffa, handleNextTurnManual, pauseMusaffa, resumeMusaffa, stopMusaffa
  };
};
