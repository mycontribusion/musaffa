import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Volume2, X, Users, CircleHelp, Repeat } from 'lucide-react';
import { getAudioUrl } from '../utils/quranUtils';
import { getAyahsForHizb, getFlatAyahsForHizb } from '../utils/quranDivisions';

// Memoized Ayah Card component for better performance
const AyahCard = React.memo(({ 
  ayah, 
  idx, 
  englishText, 
  isActive, 
  isPlaying, 
  surahNumber,
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
      id={`hizb-ayah-${ayah.surahNumber}-${ayah.numberInSurah}`} 
      data-ayah-num={ayah.numberInSurah}
      data-surah-num={ayah.surahNumber}
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
        contentVisibility: 'auto',
        containIntrinsicSize: '200px',
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
            {ayah.surahNumber}:{ayah.numberInSurah}
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

const HizbDetail = ({ hizbNumber, surahs, handleSelectSurah, quranAr, quranEn, setView, setSelectedHizb, setIsSwipeTransition, onBack, openMusaffaConfig, waqarData, lastRead, setLastRead, reciter, targetAyah = null, setTargetAyah }) => {
  // Build grouped ayahs for this hizb
  const hizbGroups = useMemo(() => {
    if (!quranAr || !quranEn || !surahs) return [];
    return getAyahsForHizb(hizbNumber, quranAr, quranEn, surahs);
  }, [hizbNumber, quranAr, quranEn, surahs]);

  // Flat list of all ayahs for audio playback
  const flatAyahs = useMemo(() => {
    if (!quranAr || !quranEn) return [];
    return getFlatAyahsForHizb(hizbNumber, quranAr, quranEn);
  }, [hizbNumber, quranAr, quranEn]);

  // Map from "surahNumber:numberInSurah" to flat index for O(1) active lookup
  const ayahIndexMap = useMemo(() => {
    const map = new Map();
    flatAyahs.forEach((a, i) => map.set(`${a.surahNumber}:${a.numberInSurah}`, i));
    return map;
  }, [flatAyahs]);

  const scrollEffectRef = useRef({ hizbNumber: null, destination: null, hasScrolled: false });
  const [highlightedAyah, setHighlightedAyahState] = useState(targetAyah);

  useEffect(() => {
    if (targetAyah) {
      setHighlightedAyahState(targetAyah);
      const timer = setTimeout(() => {
        setHighlightedAyahState(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [targetAyah, hizbNumber]);

  useEffect(() => {
    return () => {
      if (setTargetAyah) setTargetAyah(null);
    };
  }, [setTargetAyah]);

  // ── Smart Header (hide on scroll down, show on scroll up) ────────────────────
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // ── Recitation Player State ──────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAyahIdx, setPlayingAyahIdx] = useState(null);
  const [playerStarted, setPlayerStarted] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const playerAudioRef = useRef(null);
  const shouldPlayRef = useRef(false);
  const isRepeatingRef = useRef(false);

  const getPlayerAudio = () => {
    if (!playerAudioRef.current) playerAudioRef.current = new Audio();
    return playerAudioRef.current;
  };

  // Stop player when leaving the hizb
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
  }, [hizbNumber]);

  const playFromIndex = useCallback((idx) => {
    if (idx >= flatAyahs.length) {
      setIsPlaying(false);
      setPlayingAyahIdx(null);
      shouldPlayRef.current = false;
      return;
    }
    const ayah = flatAyahs[idx];
    const url = getAudioUrl(ayah.number, reciter, ayah.surahNumber, ayah.numberInSurah);
    const audio = getPlayerAudio();
    audio.pause();
    audio.src = url;
    setPlayingAyahIdx(idx);
    shouldPlayRef.current = true;

    // Auto-scroll to playing ayah
    setTimeout(() => {
      const el = document.getElementById(`hizb-ayah-${ayah.surahNumber}-${ayah.numberInSurah}`);
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
  }, [flatAyahs, reciter]);

  const handlePlayHizb = useCallback(() => {
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
    const total = flatAyahs.length;
    const idx = Math.min(total - 1, (playingAyahIdx ?? 0) + 1);
    setIsPlaying(true);
    playFromIndex(idx);
  }, [flatAyahs, playFromIndex, playingAyahIdx]);

  const handleToggleRepeat = useCallback(() => {
    setIsRepeating((prev) => {
      const next = !prev;
      isRepeatingRef.current = next;
      return next;
    });
  }, []);

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
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        setHeaderVisible(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll on entry: to an explicit target ayah, otherwise to the last-read ayah, otherwise to the top
  useEffect(() => {
    if (!quranAr || !quranEn) return;

    const destination = targetAyah
      || (lastRead && lastRead.hizbNumber === hizbNumber ? lastRead.ayahNumber : null);

    if (
      scrollEffectRef.current.hizbNumber === hizbNumber &&
      scrollEffectRef.current.destination === destination &&
      scrollEffectRef.current.hasScrolled
    ) {
      return;
    }

    scrollEffectRef.current = {
      hizbNumber,
      destination,
      hasScrolled: true,
    };

    if (destination) {
      const attemptScroll = (attempts = 0) => {
        const els = document.querySelectorAll(`[data-ayah-num="${destination}"]`);
        let targetEl = null;
        if (els.length === 1) {
          targetEl = els[0];
        } else if (els.length > 1) {
          targetEl = els[0];
        }
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          requestAnimationFrame(() => {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        } else if (attempts < 25) {
          setTimeout(() => attemptScroll(attempts + 1), 40);
        }
      };
      const t = setTimeout(() => attemptScroll(), 60);
      return () => clearTimeout(t);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [hizbNumber, targetAyah, quranAr, quranEn]);

  // Track scroll position and save last-read ayah
  useEffect(() => {
    if (!quranAr || !quranEn) return;
    
    const observerOptions = {
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };
    
    let timeoutId = null;
    const observer = new IntersectionObserver((entries) => {
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
          const surahNum = Number(bestEntry.target.getAttribute('data-surah-num'));
          if (!isNaN(ayahNum) && !isNaN(surahNum)) {
            setLastRead({ hizbNumber, surahNumber: surahNum, ayahNumber: ayahNum });
          }
        }, 300);
      }
    }, observerOptions);
    
    const ayahEls = document.querySelectorAll('[data-ayah-num]');
    ayahEls.forEach(el => observer.observe(el));
    
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hizbNumber, setLastRead, quranAr, quranEn, flatAyahs.length]);

  if (!quranAr || !quranEn) return null;

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    const velocity = 500;
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      // Swiped left → go to next hizb
      if (setSelectedHizb && hizbNumber < 60) {
        setIsSwipeTransition?.(true);
        setSelectedHizb(hizbNumber + 1);
      }
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      // Swiped right → go to previous hizb
      if (setSelectedHizb && hizbNumber > 1) {
        setIsSwipeTransition?.(true);
        setSelectedHizb(hizbNumber - 1);
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
              <h2 style={{ fontSize: 'var(--fs-page)', fontWeight: '800', color: 'var(--text-primary)' }}>
                Hizb {hizbNumber}
              </h2>
              <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {hizbGroups.length > 0 
                  ? `${hizbGroups[0].surah.englishName} ${hizbGroups[0].surah.number}:${hizbGroups[0].ayahs[0].numberInSurah} – ${hizbGroups[hizbGroups.length - 1].surah.englishName} ${hizbGroups[hizbGroups.length - 1].surah.number}:${hizbGroups[hizbGroups.length - 1].ayahs[hizbGroups[hizbGroups.length - 1].ayahs.length - 1].numberInSurah}`
                  : ''
                }
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                onClick={() => openMusaffaConfig && openMusaffaConfig({ number: hizbGroups[0]?.surah?.number || 1 })}
                className="icon-btn"
                aria-label="Open Musaffa for this Hizb"
                title="Musaffa"
              >
                <Users size={18} />
              </button>
              <button
                onClick={handlePlayHizb}
                className={`icon-btn ${isPlaying ? 'active' : ''}`}
                title={isPlaying ? "Pause Hizb" : "Play Hizb"}
                aria-label={isPlaying ? "Pause Hizb recitation" : "Play Hizb recitation"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Title + Info */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' }}>
        <div style={{ position: 'relative' }}>
          <h1 className="arabic-text" style={{ fontSize: '4rem', color: 'var(--text-primary)', marginBottom: '-0.5rem' }}>
            Hizb {hizbNumber}
          </h1>
          <div style={{ height: '2px', width: '60%', background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)', margin: '0 auto' }} />
        </div>
        <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)' }}>
          {flatAyahs.length} Ayahs · {hizbGroups.length} Surah{hizbGroups.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Ayahs List — grouped by surah */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '800px', margin: '0 auto', padding: '2rem 0 10rem' }}>
        {hizbGroups.map((group, gi) => (
          <React.Fragment key={group.surah.number}>
            {/* Surah header within the hizb — centered with verse range */}
            {hizbGroups.length > 1 && (
              <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)', 
                marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)',
                borderBottom: '1px solid var(--glass-border)', textAlign: 'center' 
              }}>
                <span style={{ 
                  fontSize: 'var(--fs-meta)', fontWeight: '800', 
                  color: 'var(--accent-gold)', textTransform: 'uppercase', 
                  letterSpacing: '0.1em' 
                }}>
                  Surah {group.surah.englishName}
                </span>
                <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
                  {group.surah.number}:{group.ayahs[0].numberInSurah} – {group.surah.number}:{group.ayahs[group.ayahs.length - 1].numberInSurah}
                </span>
              </div>
            )}

            {group.ayahs.map((ayah, ai) => {
              const flatIdx = ayahIndexMap.get(`${ayah.surahNumber}:${ayah.numberInSurah}`);
              const isActive = playingAyahIdx !== null && flatIdx === playingAyahIdx;
              const isHighlighted = highlightedAyah === ayah.numberInSurah;

              return (
                <AyahCard
                  key={`${ayah.surahNumber}-${ayah.numberInSurah}`}
                  ayah={ayah}
                  idx={ai}
                  englishText={ayah.englishText}
                  isActive={isActive}
                  isHighlighted={isHighlighted}
                  isPlaying={isPlaying}
                  surahNumber={ayah.surahNumber}
                  onAyahTap={handleAyahTap}
                />
              );
            })}
          </React.Fragment>
        ))}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Hizb {hizbNumber}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '700', color: playingAyahIdx !== null ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    {playingAyahIdx !== null
                      ? `Ayah ${playingAyahIdx + 1} of ${flatAyahs.length}`
                      : `${flatAyahs.length} Ayahs`}
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

export default HizbDetail;
