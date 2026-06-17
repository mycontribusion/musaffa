import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, AlertCircle, BookOpen, Trash2, ArrowRight, BrainCircuit, Play } from 'lucide-react';

const WeaknessTracker = ({
  stumbles,
  setStumbles,
  surahs,
  setView,
  setPartnerSubView,
  setMusaffaParams,
  handleSelectSurah
}) => {
  const [history] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_recitation_history') || '[]'); }
    catch { return []; }
  });

  // Group stumbles by Surah
  const groupedStumbles = useMemo(() => {
    const groups = {};
    stumbles.forEach(stumble => {
      if (!groups[stumble.surahNumber]) {
        groups[stumble.surahNumber] = {
          surahNumber: stumble.surahNumber,
          surahName: stumble.surahName,
          ayahs: [],
        };
      }
      groups[stumble.surahNumber].ayahs.push(stumble);
    });
    return Object.values(groups).sort((a, b) => a.surahNumber - b.surahNumber);
  }, [stumbles]);

  const clearStumbles = () => {
    if (window.confirm("Are you sure you want to clear your Mistake Book?")) {
      setStumbles([]);
    }
  };

  const handlePractice = (surahNumber, ayahs) => {
    const surah = surahs.find(s => s.number === surahNumber);
    if (!surah) return;
    handleSelectSurah(surah);
    
    // Configure Musaffa to specifically target the range of mistakes
    const minAyah = Math.min(...ayahs.map(a => a.numberInSurah));
    const maxAyah = Math.max(...ayahs.map(a => a.numberInSurah));
    
    setMusaffaParams(p => ({
      ...p,
      startSurah: surahNumber,
      endSurah: surahNumber,
      startAyah: minAyah,
      endAyah: maxAyah,
      portion: 'verse', // Practice specific verses
      errorDetection: true,
      autoNext: true,
      whoStarts: 'user'
    }));
    
    setPartnerSubView('config');
    setView('partner');
  };

  // Average accuracy from history
  const averageAccuracy = useMemo(() => {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, record) => acc + (record.accuracy || 0), 0);
    return Math.round(sum / history.length);
  }, [history]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-24">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 90, padding: '1rem 0' }}>
        <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setView('list')} className="icon-btn" style={{ width: '36px', height: '36px' }}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="var(--accent-gold)" /> Mistake Book
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Review and master your weak points</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
        
        {/* Top Stats Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Stumbles</p>
            <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)', lineHeight: 1 }}>{stumbles.length}</p>
          </div>
          <div style={{ width: '1px', background: 'var(--glass-border)', alignSelf: 'stretch' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Avg. Accuracy</p>
            <p style={{ fontSize: '2.5rem', fontWeight: '900', color: averageAccuracy >= 80 ? 'var(--accent-emerald)' : 'var(--accent-gold)', lineHeight: 1 }}>{averageAccuracy}%</p>
          </div>
        </div>

        {/* Stumbles List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Your Weaknesses</h2>
            {stumbles.length > 0 && (
              <button onClick={clearStumbles} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence>
              {groupedStumbles.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
                  <CheckCircle size={48} color="var(--accent-emerald)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>No Stumbles Recorded</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '300px', margin: '0.5rem auto 0' }}>Your mistake book is empty! Use the Smart Musaffa mode to track your recitation accuracy.</p>
                </motion.div>
              ) : (
                groupedStumbles.map((group) => (
                  <motion.div key={group.surahNumber} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '900', color: 'var(--accent-gold)' }}>
                          {group.surahNumber}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{group.surahName}</h3>
                          <p style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: '700' }}>{group.ayahs.length} mistake{group.ayahs.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => handlePractice(group.surahNumber, group.ayahs)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
                        fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s'
                      }} className="hover-scale">
                        <BrainCircuit size={14} /> Practice
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {group.ayahs.map(ayah => (
                        <div key={ayah.number} style={{
                          padding: '0.4rem 0.8rem', borderRadius: '999px', background: 'var(--bg-accent)',
                          border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: '700',
                          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem'
                        }}>
                          Ayah {ayah.numberInSurah}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// CheckCircle missing from import, add it locally or import
import { CheckCircle } from 'lucide-react';

export default WeaknessTracker;
