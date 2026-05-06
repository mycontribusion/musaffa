import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Zap, Download, Trash2, Play, Pause, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { useAudioDownload } from '../hooks/useAudioDownload';
import { getAudioUrl } from '../utils/quranUtils';

const SurahDetail = ({ selectedSurah, surahs, handleSelectSurah, quranAr, quranEn, setView, openMusaffaConfig, waqarData, lastRead, setLastRead, reciter, audioDownloadControls }) => {
  const scrollTrackerRef = useRef(null);
  const scrollEffectRef = useRef({ surahNumber: null, hasScrolled: false });
  const { downloadStatus, downloadSurahAudio, deleteSurahAudio, isSurahAudioDownloaded } = audioDownloadControls;

  // ── Smart Header (hide on scroll down, show on scroll up) ────────────────────
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // ── Recitation Player State ──────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAyahIdx, setPlayingAyahIdx] = useState(null);
  const [playerStarted, setPlayerStarted] = useState(false); // controls bar visibility
  const playerAudioRef = useRef(null);
  const shouldPlayRef = useRef(false);

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
    if (!selectedSurah || !quranAr) return;
    const arabicAyahs = quranAr.surahs[selectedSurah.number - 1].ayahs;
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
      if (shouldPlayRef.current) playFromIndex(idx + 1);
    };
    audio.onerror = () => {
      if (shouldPlayRef.current) playFromIndex(idx + 1);
    };
  }, [selectedSurah, quranAr, reciter]);

  const handlePlaySurah = () => {
    setPlayerStarted(true);
    setIsPlaying(true);
    playFromIndex(playingAyahIdx ?? 0);
  };

  const handlePlayPause = () => {
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
  };

  const handleAyahTap = (idx) => {
    setPlayerStarted(true);
    setIsPlaying(true);
    playFromIndex(idx);
  };

  const handleClosePlayer = () => {
    const audio = getPlayerAudio();
    audio.pause();
    audio.src = '';
    shouldPlayRef.current = false;
    setIsPlaying(false);
    setPlayingAyahIdx(null);
    setPlayerStarted(false);
  };

  const handlePrevAyah = () => {
    const idx = Math.max(0, (playingAyahIdx ?? 0) - 1);
    setIsPlaying(true);
    playFromIndex(idx);
  };

  const handleNextAyah = () => {
    if (!selectedSurah || !quranAr) return;
    const total = quranAr.surahs[selectedSurah.number - 1].ayahs.length;
    const idx = Math.min(total - 1, (playingAyahIdx ?? 0) + 1);
    setIsPlaying(true);
    playFromIndex(idx);
  };

  // Keep isPlaying in sync when audio finishes naturally
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

  // Feature 3: Auto-scroll to last-read ayah when returning to a surah, or top if no last-read
  useEffect(() => {
    if (!selectedSurah || !quranAr || !quranEn) return;

    // Check if we've already scrolled for this surah
    if (scrollEffectRef.current.surahNumber === selectedSurah.number && scrollEffectRef.current.hasScrolled) {
      return;
    }

    // Update the ref to track this surah
    scrollEffectRef.current.surahNumber = selectedSurah.number;
    scrollEffectRef.current.hasScrolled = true;

    if (lastRead && lastRead.surahNumber === selectedSurah.number) {
      // Scroll to last-read ayah - wait for DOM to render
      const attemptScroll = (attempts = 0) => {
        const el = document.getElementById(`surah-ayah-${lastRead.ayahNumber}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (attempts < 10) {
          // Retry if element not found yet
          setTimeout(() => attemptScroll(attempts + 1), 50);
        }
      };
      attemptScroll();
    } else {
      // No last-read for this surah, scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedSurah ? selectedSurah.number : null]);

  // Feature 3: Track scroll position and save last-read ayah
  const trackScroll = useCallback(() => {
    if (!selectedSurah || !quranAr || !quranEn) return;
    if (scrollTrackerRef.current) return; // throttle
    scrollTrackerRef.current = setTimeout(() => {
      scrollTrackerRef.current = null;
      // Find the ayah element closest to the top of the viewport
      const ayahEls = document.querySelectorAll('[data-ayah-num]');
      let closest = null;
      let closestDist = Infinity;
      ayahEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top);
        if (dist < closestDist) {
          closestDist = dist;
          closest = el;
        }
      });
      if (closest) {
        const ayahNum = Number(closest.getAttribute('data-ayah-num'));
        setLastRead({ surahNumber: selectedSurah.number, ayahNumber: ayahNum });
      }
    }, 500);
  }, [selectedSurah ? selectedSurah.number : null, setLastRead]);

  useEffect(() => {
    if (!selectedSurah || !quranAr || !quranEn) return;
    window.addEventListener('scroll', trackScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', trackScroll);
      if (scrollTrackerRef.current) clearTimeout(scrollTrackerRef.current);
    };
  }, [trackScroll]);

  if (!selectedSurah || !quranAr || !quranEn) return null;

  const surahIndex = selectedSurah.number - 1;
  const arabicAyahs = quranAr.surahs[surahIndex].ayahs;
  const englishAyahs = quranEn.surahs[surahIndex].ayahs;
  // Exact Bismillah string from the dataset (Surah 1:1)
  const BISMILLAH = quranAr.surahs[0].ayahs[0].text;

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    const velocity = 500;
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      if (selectedSurah.number < 114) {
        handleSelectSurah(surahs[selectedSurah.number]);
      }
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      if (selectedSurah.number > 1) {
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
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', cursor: 'grab' }}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Header — hides on scroll down, shows on scroll up */}
      <motion.div
        animate={{ y: headerVisible ? 0 : -80, opacity: headerVisible ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ position: 'sticky', top: '4.5rem', zIndex: 90 }}
      >
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
          <button onClick={() => setView('list')} className="icon-btn">
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedSurah.englishName}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Play Surah button */}
            <button
              onClick={handlePlaySurah}
              className="icon-btn"
              title="Play Surah"
              style={{ color: isPlaying ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            {isSurahAudioDownloaded(selectedSurah.number) ? (
              <button
                onClick={() => deleteSurahAudio(selectedSurah.number)}
                className="icon-btn"
                title="Delete downloaded audio"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Trash2 size={18} />
              </button>
            ) : !downloadStatus.isDownloading && (
              <button
                onClick={() => downloadSurahAudio(selectedSurah.number)}
                className="icon-btn"
                title="Download audio for offline use"
              >
                <Download size={18} />
              </button>
            )}
            {downloadStatus.isDownloading && (
              <div className="icon-btn" style={{ position: 'relative' }}>
                <Download size={18} style={{ opacity: 0.7 }} />
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: 'var(--accent-gold)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  minWidth: '18px',
                  textAlign: 'center',
                }}>
                  {downloadStatus.progress}%
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Title + Session Button */}
      <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <h1 className="arabic-text" style={{ fontSize: '4rem', color: 'var(--text-primary)', marginBottom: '-0.5rem' }}>
            {selectedSurah.name}
          </h1>
          <div style={{ height: '2px', width: '60%', background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)', margin: '0 auto' }} />
        </div>
        {/* Download Status */}
        {downloadStatus.message && (
          <div style={{
            background: downloadStatus.isDownloading ? 'rgba(30, 58, 138, 0.8)' : downloadStatus.error ? 'rgba(185, 28, 28, 0.8)' : 'rgba(16, 185, 129, 0.8)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backdropFilter: 'blur(4px)',
            border: `1px solid ${downloadStatus.isDownloading ? 'rgba(30, 58, 138, 0.6)' : downloadStatus.error ? 'rgba(185, 28, 28, 0.6)' : 'rgba(16, 185, 129, 0.6)'}`,
          }}>
            {downloadStatus.isDownloading && (
              <div className="animate-pulse" style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}></div>
            )}
            {!downloadStatus.isDownloading && !downloadStatus.error && (
              <Download size={16} strokeWidth={1.5} />
            )}
            {downloadStatus.error && (
              <span role="img" aria-label="error">⚠️</span>
            )}
            <span>{downloadStatus.message}</span>
          </div>
        )}
        {waqarData && waqarData[selectedSurah.number] && (
          <button
            onClick={() => setView('mutashabihat-session')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: '1rem',
              color: 'var(--accent-gold)',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 8px 24px -8px rgba(212,175,55,0.2)'
            }}
            className="hover-scale"
          >
            <Zap size={18} strokeWidth={2.5} />
            <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Mutashabihat Session</span>
          </button>
        )}
      </div>

      {/* Ayahs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', maxWidth: '800px', margin: '0 auto', padding: '2rem 0 10rem' }}>
        {/* Unnumbered Bismillah */}
        {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="arabic-text" style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', opacity: 0.8 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          </div>
        )}

        {arabicAyahs.map((ayah, idx) => {
          let displayText = ayah.text;
          const isActive = playingAyahIdx === idx;

          return (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              key={ayah.number}
              id={`surah-ayah-${ayah.numberInSurah}`} data-ayah-num={ayah.numberInSurah}
              onClick={() => handleAyahTap(idx)}
              style={{
                display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.25rem 0.75rem',
                borderRadius: '1rem', cursor: 'pointer', transition: 'background 0.3s',
                background: isActive ? 'var(--accent-gold-soft)' : 'transparent',
                border: isActive ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
              }}
            >
              {/* Ayah number indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)' }} />
                <div style={{
                  padding: '0.2rem 0.6rem', borderRadius: '9999px',
                  border: `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--glass-border)'}`,
                  background: isActive ? 'var(--accent-gold)' : 'var(--glass-bg)',
                  fontSize: '0.6rem', fontWeight: '800',
                  color: isActive ? '#000' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '0.3rem'
                }}>
                  {isActive && isPlaying && <Volume2 size={9} />}
                  {selectedSurah.number}:{ayah.numberInSurah}
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--glass-border), transparent)' }} />
              </div>

              {/* Arabic */}
              <div className="arabic-text" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '1.8', color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)', textAlign: 'center', transition: 'color 0.3s' }}>
                {displayText}
              </div>

              {/* Translation */}
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '300', lineHeight: '1.5', padding: '0 1rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                {englishAyahs[idx]?.text}
              </div>
            </motion.div>
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
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
              padding: '0.75rem 1rem 1.25rem',
              background: 'var(--bg-primary)',
              borderTop: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Ayah label + close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {selectedSurah.englishName}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: playingAyahIdx !== null ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    {playingAyahIdx !== null
                      ? `Ayah ${arabicAyahs[playingAyahIdx]?.numberInSurah} of ${arabicAyahs.length}`
                      : `${arabicAyahs.length} Ayahs`}
                  </span>
                  <button
                    onClick={handleClosePlayer}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.15rem', display: 'flex', alignItems: 'center' }}
                    title="Close player"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                <button
                  onClick={handlePrevAyah}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
                >
                  <SkipBack size={20} />
                </button>

                <button
                  onClick={handlePlayPause}
                  style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'var(--accent-gold)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                  }}
                >
                  {isPlaying
                    ? <Pause size={22} color="#000" fill="#000" />
                    : <Play size={22} color="#000" fill="#000" style={{ marginLeft: '2px' }} />}
                </button>

                <button
                  onClick={handleNextAyah}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
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
