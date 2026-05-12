import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Users } from 'lucide-react';

const SurahDetail = ({ selectedSurah, quranAr, quranEn, setView, openMusaffaConfig }) => {
  if (!selectedSurah || !quranAr || !quranEn) return null;

  const surahIndex = selectedSurah.number - 1;
  const arabicAyahs = quranAr.surahs[surahIndex].ayahs;
  const englishAyahs = quranEn.surahs[surahIndex].ayahs;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}
    >
      {/* Detail Header */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', sticky: 'top', top: '0.5rem', zIndex: 90 }}>
        <button 
          onClick={() => setView('list')} 
          className="icon-btn"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedSurah.englishName}</h2>
          <p className="arabic" style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-gold)', opacity: 0.6, letterSpacing: '0.2em' }}>{selectedSurah.name}</p>
        </div>

        <button 
          onClick={() => openMusaffaConfig(selectedSurah)} 
          style={{ 
            padding: '0.75rem', 
            background: 'rgba(251, 191, 36, 0.1)', 
            border: '1px solid rgba(251, 191, 36, 0.1)', 
            borderRadius: '0.75rem', 
            color: 'var(--accent-gold)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <Users size={18} strokeWidth={2} />
          <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Partner</span>
        </button>
      </div>

      {/* Ayahs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem', maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1rem' }}>
        {arabicAyahs.map((ayah, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }}
            key={ayah.number} 
            style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
          >
            {/* Ayah Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)' }} />
               <div style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                {selectedSurah.number}:{ayah.numberInSurah}
               </div>
               <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--glass-border), transparent)' }} />
            </div>

            {/* Arabic Text */}
            <div className="arabic-text" style={{ fontSize: '2.5rem', lineHeight: '2', color: 'var(--text-primary)', textAlign: 'center' }}>
              {ayah.text}
            </div>

            {/* Translation */}
            <div style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: '300', lineHeight: '1.6', padding: '0 1.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              {englishAyahs[idx].text}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SurahDetail;
