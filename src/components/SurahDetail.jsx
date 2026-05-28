import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Zap, Download, Trash2 } from 'lucide-react';
import { useAudioDownload } from '../hooks/useAudioDownload';

const SurahDetail = ({ selectedSurah, surahs, handleSelectSurah, quranAr, quranEn, setView, openMusaffaConfig, waqarData, lastRead, setLastRead, reciter }) => {
  const scrollTrackerRef = useRef(null);
  const scrollEffectRef = useRef({ surahNumber: null, hasScrolled: false });
  const { downloadStatus, downloadSurahAudio, deleteSurahAudio, isSurahAudioDownloaded, downloadedSurahs } = useAudioDownload(quranAr, reciter);

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
       {/* Header */}
       <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', position: 'sticky', top: '0.5rem', zIndex: 90 }}>
         <button onClick={() => setView('list')} className="icon-btn">
           <ChevronLeft size={18} />
         </button>
         <div style={{ textAlign: 'center' }}>
           <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedSurah.englishName}</h2>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', maxWidth: '800px', margin: '0 auto', padding: '2rem 0' }}>
        {/* Unnumbered Bismillah */}
        {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="arabic-text" style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', opacity: 0.8 }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          </div>
        )}

        {arabicAyahs.map((ayah, idx) => {
          let displayText = ayah.text;
          if (selectedSurah.number !== 1 && selectedSurah.number !== 9 && ayah.numberInSurah === 1) {
            const cleanBismillah = BISMILLAH.replace(/\uFEFF/g, '');
            const cleanText = displayText.replace(/\uFEFF/g, '');
            if (cleanText.startsWith(cleanBismillah)) {
              displayText = cleanText.slice(cleanBismillah.length).trim();
            }
          }

          return (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              key={ayah.number}
              id={`surah-ayah-${ayah.numberInSurah}`} data-ayah-num={ayah.numberInSurah}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}
            >
              {/* Ayah number indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)' }} />
                <div style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                  {selectedSurah.number}:{ayah.numberInSurah}
                </div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--glass-border), transparent)' }} />
              </div>

              {/* Arabic */}
              <div className="arabic-text" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '1.8', color: 'var(--text-primary)', textAlign: 'center' }}>
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
    </motion.div>
  );
};

export default SurahDetail;
