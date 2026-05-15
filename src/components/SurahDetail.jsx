import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Zap } from 'lucide-react';

const SurahDetail = ({ selectedSurah, surahs, handleSelectSurah, quranAr, quranEn, setView, openMusaffaConfig, waqarData }) => {
  if (!selectedSurah || !quranAr || !quranEn) return null;

  const surahIndex = selectedSurah.number - 1;
  const arabicAyahs = quranAr.surahs[surahIndex].ayahs;
  const englishAyahs = quranEn.surahs[surahIndex].ayahs;
  // Exact Bismillah string from the dataset (Surah 1:1)
  const BISMILLAH = quranAr.surahs[0].ayahs[0].text;

  // Scroll to top whenever the selected surah changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedSurah.number]);

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
        <div style={{ width: 40 }} />
      </div>

      {/* Title + Session Button */}
      <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <h1 className="arabic-text" style={{ fontSize: '4rem', color: 'var(--text-primary)', marginBottom: '-0.5rem' }}>
            {selectedSurah.name}
          </h1>
          <div style={{ height: '2px', width: '60%', background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)', margin: '0 auto' }} />
        </div>

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
