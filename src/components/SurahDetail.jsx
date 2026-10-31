import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Volume2, X, Users, CircleHelp, Repeat } from 'lucide-react';
import { getAudioUrl } from '../utils/quranUtils';

// Memoized Ayah Card component for better performance
const AyahCard = React.memo(({ 
  ayah, 
  idx, 
  englishText, 
  isActive, 
  isPlaying, 
  selectedSurahNumber,
  onAyahTap,
  isHighlighted,
}) => {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onAyahTap(idx);
  }, [onAyahTap, idx]);

  const handleMouseEnter = useCallback((e) => {
    e.currentTarget.style.background = 'var(--glass-hover)';
    e.currentTarget.style.color = 'var(--accent-gold)';
    e.currentTarget.style.borderColor = 'var(--accent-gold)';
    e.currentTarget.style.transform = 'scale(1.08)';
  }, []);

  const handleMouseLeave = useCallback((e) => {
    e.currentTarget.style.background = isActive ? (isPlaying ? 'var(--gold-gradient)' : 'var(--glass-bg)') : 'var(--glass-bg)';
    e.currentTarget.style.color = isActive ? (isPlaying ? 'var(--text-on-gold)' : 'var(--accent-gold)') : 'var(--text-muted)';
    e.currentTarget.style.borderColor = isActive ? 'var(--accent-gold)' : 'var(--glass-border)';
    e.currentTarget.style.transform = 'scale(1)';
  }, [isActive, isPlaying]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(idx * 0.005, 0.2) }}
      id={`surah-ayah-${ayah.numberInSurah}`} 
      data-ayah-num={ayah.numberInSurah}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
        padding: '1.25rem 0.75rem var(--space-1)',
        borderRadius: 'var(--radius-md)',
        transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        background: isActive 
          ? 'var(--accent-gold-soft)' 
          : isHighlighted 
            ? 'var(--accent-gold-soft)' 
            : 'transparent',
        border: isActive 
          ? '1px solid rgba(212,175,55,0.4)' 
          : isHighlighted 
            ? '1px solid var(--accent-gold)' 
            : '1px solid transparent',
        boxShadow: isHighlighted ? '0 0 16px rgba(212,175,55,0.25)' : 'none',
      }}
    >
      {/* Ayah number indicator & play control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
            border: `1px solid ${isActive || isHighlighted ? 'var(--accent-gold)' : 'var(--glass-border)'}`,
            background: isActive || isHighlighted ? 'var(--gold-gradient)' : 'var(--glass-bg)',
            fontSize: 'var(--fs-micro)', fontWeight: '800',
            color: isActive || isHighlighted ? 'var(--text-on-gold)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            transition: 'all 0.4s ease'
          }}>
            {isActive && isPlaying && <Volume2 size={9} />}
            {selectedSurahNumber}:{ayah.numberInSurah}
          </div>

          <button
            onClick={handleClick}
            aria-label={isActive && isPlaying ? `Pause ayah ${ayah.numberInSurah}` : `Play ayah ${ayah.numberInSurah}`}
            title={isActive && isPlaying ? "Pause ayah" : "Play ayah"}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--glass-border)'}`,
              background: isActive ? (isPlaying ? 'var(--gold-gradient)' : 'var(--glass-bg)') : 'var(--glass-bg)',
              color: isActive ? (isPlaying ? 'var(--text-on-gold)' : 'var(--accent-gold)') : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {isActive && isPlaying ? (
              <Pause size={10} fill="currentColor" />
            ) : (
              <Play size={10} fill={isActive ? 'currentColor' : 'none'} style={{ marginLeft: '1px' }} />
            )}
          </button>
        </div>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--glass-border), transparent)' }} />
      </div>

      {/* Arabic — flush right (RTL), opposite the translation below */}
      <div className="arabic-text" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '1.8', color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)', textAlign: 'right', transition: 'color 0.3s' }}>
        {ayah.text}
      </div>

      {/* Translation — flush left */}
      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-card)', fontWeight: '450', lineHeight: '1.5', padding: '0 1rem', textAlign: 'left', maxWidth: '600px', marginTop: '3.5rem' }}>
        {englishText}
      </div>
    </motion.div>
  );
});

AyahCard.displayName = 'AyahCard';

const SurahDetail = ({ selectedSurah, surahs, handleSelectSurah, quranAr, quranEn, setView, setIsSwipeTransition, onBack, openMusaffaConfig, waqarData, lastRead, updateLastRead, reciter, targetAyah = null, setTargetAyah, forceStart = false, setForceStart }) => {
  const surahIndex = useMemo(() => selectedSurah ? selectedSurah.number - 1 : 0, [selectedSurah?.number]);
  const arabicAyahs = useMemo(() => (quranAr?.surahs && selectedSurah) ? quranAr.surahs[surahIndex]?.ayahs || [] : [], [quranAr, surahIndex, selectedSurah]);
  const englishAyahs = useMemo(() => (quranEn?.surahs && selectedSurah) ? quranEn.surahs[surahIndex]?.ayahs || [] : [], [quranEn, surahIndex, selectedSurah]);
  // Exact Bismillah string from the dataset (Surah 1:1)
  const BISMILLAH = useMemo(() => quranAr?.surahs?.[0]?.ayahs?.[0]?.text || '', [quranAr]);

  const scrollEffectRef = useRef({ surahNumber: null, destination: null, hasScrolled: false });
  const scrolledTargetRef = useRef(null);
  const [highlightedAyah, setHighlightedAyah] = useState(targetAyah);

  useEffect(() => {
    if (targetAyah) {
      setHighlightedAyah(targetAyah);
      const timer = setTimeout(() => {
        setHighlightedAyah(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [targetAyah, selectedSurah?.number]);

  useEffect(() => {
    return () => {
      // Don't clear targetAyah on unmount - it may be needed for navigation
      // and clearing it causes jumps back to lastRead position
    };
  }, []);

  /* The download status card that used to sit under the surah title has been
     removed: download progress and its cancel control now live solely in the
     Audio Manager, so this view no longer consumes `audioDownloadControls`. */

  // ── Smart Header (hide on scroll down, show on scroll up) ────────────────────
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // ── Recitation Player State ──────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAyahIdx, setPlayingAyahIdx] = useState(null);
  const [playerStarted, setPlayerStarted] = useState(false); // controls bar visibility
  const [isRepeating, setIsRepeating] = useState(false);
  const playerAudioRef = useRef(null);
  const shouldPlayRef = useRef(false);
  const isRepeatingRef = useRef(false);

  const getPlayerAudio = () => {
    if (!playerAudioRef.current) playerAudioRef.current = new Audio();
    return playerAudioRef.current;
  };

  // Stop player when leaving the surah
  useEffect(() => {
    return () => {
      if (playerAudioRef.current) {
        playerAudioRef.current.pause();
        playerAudioRef.current.src = '';
      }
      shouldPlayRef.current = false;
      setPlayerStarted(false);
      setIsPlaying(false);
      setPlayingAyahIdx(null);
    };
  }, [selectedSurah?.number]);

  const playFromIndex = useCallback((idx) => {
    if (!selectedSurah || !arabicAyahs) return;
    if (idx >= arabicAyahs.length) {
      // Finished surah
      setIsPlaying(false);
      setPlayingAyahIdx(null);
      shouldPlayRef.current = false;
      return;
    }
    const ayah = arabicAyahs[idx];
    const url = getAudioUrl(ayah.number, reciter, selectedSurah.number, ayah.numberInSurah);
    const audio = getPlayerAudio();
    audio.pause();
    audio.src = url;
    setPlayingAyahIdx(idx);
    shouldPlayRef.current = true;

    // Auto-scroll to playing ayah
    setTimeout(() => {
      const el = document.getElementById(`surah-ayah-${ayah.numberInSurah}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    audio.play().catch(() => { });
    audio.onended = () => {
      if (!shouldPlayRef.current) return;
      if (isRepeatingRef.current) {
        playFromIndex(idx);
      } else {
        playFromIndex(idx + 1);
      }
    };
    audio.onerror = () => {
      if (!shouldPlayRef.current) return;
      if (isRepeatingRef.current) {
        playFromIndex(idx);
      } else {
        playFromIndex(idx + 1);
      }
    };
  }, [selectedSurah, arabicAyahs, reciter]);

  const handlePlaySurah = useCallback(() => {
    setPlayerStarted(true);
    setIsPlaying(true);
    playFromIndex(playingAyahIdx ?? 0);
  }, [playFromIndex, playingAyahIdx]);

  const handlePlayPause = useCallback(() => {
    const audio = getPlayerAudio();
    if (isPlaying) {
      audio.pause();
      shouldPlayRef.current = false;
      setIsPlaying(false);
    } else {
      const startIdx = playingAyahIdx ?? 0;
      setIsPlaying(true);
      playFromIndex(startIdx);
    }
  }, [isPlaying, playFromIndex, playingAyahIdx]);

  const handleAyahTap = useCallback((idx) => {
    if (playingAyahIdx === idx && isPlaying) {
      handlePlayPause();
    } else {
      setPlayerStarted(true);
      setIsPlaying(true);
      playFromIndex(idx);
    }
  }, [playingAyahIdx, isPlaying, handlePlayPause, playFromIndex]);

  const handleClosePlayer = useCallback(() => {
    const audio = getPlayerAudio();
    audio.pause();
    audio.src = '';
    shouldPlayRef.current = false;
    setIsPlaying(false);
    setPlayingAyahIdx(null);
    setPlayerStarted(false);
  }, []);

  const handlePrevAyah = useCallback(() => {
    const idx = Math.max(0, (playingAyahIdx ?? 0) - 1);
    setIsPlaying(true);
    playFromIndex(idx);
  }, [playFromIndex, playingAyahIdx]);

  const handleNextAyah = useCallback(() => {
    if (!selectedSurah || !arabicAyahs) return;
    const total = arabicAyahs.length;
    const idx = Math.min(total - 1, (playingAyahIdx ?? 0) + 1);
    setIsPlaying(true);
    playFromIndex(idx);
  }, [selectedSurah, arabicAyahs, playFromIndex, playingAyahIdx]);

  const handleToggleRepeat = useCallback(() => {
    setIsRepeating((prev) => {
      const next = !prev;
      isRepeatingRef.current = next;
      return next;
    });
  }, []);

  // Keep isPlaying in sync when audio finishes naturally
  useEffect(() => {
    isRepeatingRef.current = isRepeating;
  }, [isRepeating]);

  useEffect(() => {
    const audio = getPlayerAudio();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => { if (!shouldPlayRef.current) setIsPlaying(false); };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // Smart header scroll detection
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setHeaderVisible(true);
      } else if (currentY < lastScrollY.current) {
        setHeaderVisible(true); // scrolling up
      } else if (currentY > lastScrollY.current + 5) {
        setHeaderVisible(false); // scrolling down
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll on entry: to an explicit target ayah (e.g. from Quran search),
  // otherwise to the last-read ayah, otherwise to the top of the surah.
  useEffect(() => {
    if (!selectedSurah || !quranAr || !quranEn) return;

    const destination = forceStart
      ? null
      : (targetAyah
        || (Array.isArray(lastRead) ? lastRead.find(e => (e.mode || 'surah') === 'surah' && e.surahNumber === selectedSurah.number)?.ayahNumber : null));
    if (forceStart && setForceStart) setForceStart(false);

    if (!destination) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    if (targetAyah && scrolledTargetRef.current === targetAyah) return;
    if (targetAyah) scrolledTargetRef.current = targetAyah;

    // Scroll to the target ayah with aggressive retries for reliability
    const attemptScroll = (attempts = 0) => {
      const el = document.getElementById(`surah-ayah-${destination}`);
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      } else if (attempts < 50) {
        setTimeout(() => attemptScroll(attempts + 1), 20);
      }
    };
    // First attempt on next frame for faster response
    requestAnimationFrame(() => attemptScroll());
    // Fallback timeout in case rAF doesn't fire
    const t = setTimeout(() => attemptScroll(), 30);
    return () => clearTimeout(t);
  }, [selectedSurah ? selectedSurah.number : null, targetAyah]);

  // Feature 3: Track scroll position and save last-read ayah (optimized with IntersectionObserver)
  useEffect(() => {
    if (!selectedSurah || !quranAr || !quranEn) return;
    
    const observerOptions = {
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };
    
    let timeoutId = null;
    const observer = new IntersectionObserver((entries) => {
      // Find the entry closest to the top
      let bestEntry = null;
      let bestScore = Infinity;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const rect = entry.boundingClientRect;
          const score = Math.abs(rect.top);
          if (score < bestScore) {
            bestScore = score;
            bestEntry = entry;
          }
        }
      }
      if (bestEntry && bestEntry.target) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const ayahNum = Number(bestEntry.target.getAttribute('data-ayah-num'));
          if (!isNaN(ayahNum)) {
            updateLastRead({ surahNumber: selectedSurah.number, ayahNumber: ayahNum, mode: 'surah' });
          }
        }, 300);
      }
    }, observerOptions);
    
    // Observe all ayah elements
    const ayahEls = document.querySelectorAll('[data-ayah-num]');
    ayahEls.forEach(el => observer.observe(el));
    
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedSurah.number, updateLastRead, quranAr, quranEn, arabicAyahs.length]); // re-observe when surah changes or ayahs change

  if (!selectedSurah || !quranAr || !quranEn) return null;

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    const velocity = 500;
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      if (selectedSurah.number < 114) {
        setIsSwipeTransition?.(true);
        handleSelectSurah(surahs[selectedSurah.number]);
      }
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      if (selectedSurah.number > 1) {
        setIsSwipeTransition?.(true);
        handleSelectSurah(surahs[selectedSurah.number - 2]);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', cursor: 'grab' }}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Header — hides on scroll down, shows on scroll up */}
      {/* Full-bleed top-level header. The global header is not rendered on the
          Surah Detail view, so this bar is the page's only header: it pins at
          `top: 0` and breaks out of `.app-container` (`100vw` plus a centred
          negative margin) so its background and hairline span the whole
          viewport. Inside, `.app-container` restores the standard page gutter,
          and `py-2` around a 36/42px `.icon-btn` row reproduces the global
          header's exact height. The previous offset
          `calc(var(--control-md-h) + var(--space-4) + 1px)` — and the fixed
          4.5rem before it — existed only to clear the global header. */}
      <motion.div
        animate={{ y: headerVisible ? 0 : -80, opacity: headerVisible ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{
          position: 'sticky', top: 0, zIndex: 'var(--z-header)',
          width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
          backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: 'var(--border-hairline)',
        }}
      >
        <div className="app-container">
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <button onClick={onBack || (() => setView('list'))} className="icon-btn" aria-label="Back" title="Back">
              <ChevronLeft size={18} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'var(--fs-page)', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedSurah.englishName}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {/* Mutashabih Quiz — jumps straight into this surah's quiz session
                  rather than the cross-surah selection screen.

                  `mutashabihat-session` was already a first-class view that
                  renders `MutashabihatSession` for exactly one surah, and every
                  input it needs is already satisfied on this screen:
                  `selectedSurah` is the surah being viewed, `waqarData` is loaded,
                  and the guard below guarantees its entries exist. App wires the
                  remaining props (`allSurahEntries`, `quranAr`, `surahs`,
                  `onClose`) itself, so no new plumbing is needed here.

                  Routing already round-trips correctly: this view maps to
                  `/surah/:n/mutashabihat`, which `syncStateWithURL` parses back
                  into `mutashabihat-session`, and the session's own `onClose`
                  returns to `detail`. Browser Back therefore still lands on the
                  surah page rather than being trapped on the session.

                  The homepage "Mutashabih Quiz" card still opens
                  `mutashabihat-selection` — that entry point is for picking
                  surahs, so the two are intentionally different.

                  `CircleHelp` is the icon already used for "Mutashabihat Quiz" in
                  PartnerMenu and MutashabihSelection, so the feature keeps one
                  glyph. */}
              {waqarData && waqarData[selectedSurah.number] && (
                <button
                  onClick={() => setView('mutashabihat-session')}
                  className="icon-btn"
                  aria-label={`Start Mutashabih quiz for ${selectedSurah.englishName}`}
                  title="Start Mutashabih Quiz"
                >
                  <CircleHelp size={18} />
                </button>
              )}
              {/* Musaffa — reuses the `openMusaffaConfig` navigation handed down by
                  App (selects this surah, then opens the existing Partner config
                  screen). `Users` is the icon already used for "Start Musaffa" in
                  PartnerMenu, so the feature keeps one glyph. */}
              <button
                onClick={() => openMusaffaConfig(selectedSurah)}
                className="icon-btn"
                aria-label="Open Musaffa for this Surah"
                title="Musaffa"
              >
                <Users size={18} />
              </button>
              {/* Play Surah button */}
              <button
                onClick={handlePlaySurah}
                className={`icon-btn ${isPlaying ? 'active' : ''}`}
                title={isPlaying ? "Pause Surah" : "Play Surah"}
                aria-label={isPlaying ? "Pause Surah recitation" : "Play Surah recitation"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              {/* Audio download/delete controls live in the Audio Manager, not in this header. */}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Title + Session Button */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' }}>
        <div style={{ position: 'relative' }}>
          <h1 className="arabic-text" style={{ fontSize: '4rem', color: 'var(--text-primary)', marginBottom: '-0.5rem' }}>
            {selectedSurah.name}
          </h1>
          <div style={{ height: '2px', width: '60%', background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)', margin: '0 auto' }} />
        </div>
      </div>

      {/* Ayahs List */}
      {/* Inter-ayah gap. Combined with each card's 0.25rem bottom padding this
          gives 2.25rem of space between a translation and the next ayah's divider
          row — exactly half the 4.5rem it was before, while the Arabic→translation
          gap inside each card was doubled. The result is a deliberate 5rem-above /
          2.25rem-below ratio, so the translation now sits visually closer to the
          next ayah than to its own Arabic. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px', margin: '0 auto', padding: '2rem 0 10rem' }}>
        {/* Unnumbered Bismillah */}
        {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="arabic-text" style={{ fontSize: '2.5rem', color: 'var(--accent-gold)' }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          </div>
        )}

        {arabicAyahs.map((ayah, idx) => {
          const isActive = playingAyahIdx === idx;
          const isHighlighted = highlightedAyah === ayah.numberInSurah;

          return (
            <AyahCard
              key={ayah.number}
              ayah={ayah}
              idx={idx}
              englishText={englishAyahs[idx]?.text}
              isActive={isActive}
              isHighlighted={isHighlighted}
              isPlaying={isPlaying}
              selectedSurahNumber={selectedSurah.number}
              onAyahTap={handleAyahTap}
            />
          );
        })}
      </div>

      {/* ── Sticky Recitation Player Bar (only after play starts) ── */}
      <AnimatePresence>
        {playerStarted && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 'var(--z-fixed)',
              padding: '0.75rem 1rem 1.25rem',
              background: 'var(--glass-bg)',
              borderTop: '1px solid var(--glass-border)',
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.18)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {/* Ayah label + close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {selectedSurah.englishName}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '700', color: playingAyahIdx !== null ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    {playingAyahIdx !== null
                      ? `Ayah ${arabicAyahs[playingAyahIdx]?.numberInSurah} of ${arabicAyahs.length}`
                      : `${arabicAyahs.length} Ayahs`}
                  </span>
                  <button
                    onClick={handleClosePlayer}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
                    title="Close player"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-5)' }}>
                <button
                  onClick={handleToggleRepeat}
                  title={isRepeating ? 'Stop repeat' : 'Repeat current verse'}
                  style={{ background: 'none', border: 'none', color: isRepeating ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: 'pointer', padding: 'var(--space-2)' }}
                >
                  <Repeat size={20} />
                </button>
                <button
                  onClick={handlePrevAyah}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 'var(--space-2)' }}
                >
                  <SkipBack size={20} />
                </button>

                <button
                  onClick={handlePlayPause}
                  style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'var(--gold-gradient)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px var(--accent-gold-soft)',
                  }}
                >
                  {isPlaying
                    ? <Pause size={22} color="var(--text-on-gold)" fill="var(--text-on-gold)" />
                    : <Play size={22} color="var(--text-on-gold)" fill="var(--text-on-gold)" style={{ marginLeft: '2px' }} />}
                </button>

                <button
                  onClick={handleNextAyah}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 'var(--space-2)' }}
                >
                  <SkipForward size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SurahDetail;
