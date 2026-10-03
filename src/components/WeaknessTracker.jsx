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
      {/* Full-bleed top-level header. The global header is not rendered on the
          Mistake Book view, so this bar is the page's only header: it pins at
          `top: 0` and breaks out of `.app-container` (`100vw` plus a centred
          negative margin) so its background and hairline span the whole
          viewport. Inside, `.app-container` restores the standard page gutter
          and `py-2` around the 36/42px `.icon-btn` reproduces the global
          header's exact height — which is also why the row is single-line: the
          former two-line title block (title + subtitle) was what made this bar
          taller than the global header. The old offset
          `calc(var(--control-md-h) + var(--space-4) + 1px)` existed only to
          clear the global header and is gone. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 'var(--z-header)',
        width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
        backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)',
      }}>
        <div className="app-container">
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button onClick={() => setView('list')} className="icon-btn">
                <ChevronLeft size={18} />
              </button>
              <h1 style={{ fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <BookOpen size={18} color="var(--accent-gold)" /> Mistake Book
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
        
        {/* Top Stats Card */}
        <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-6)', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 'var(--fs-secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Total Stumbles</p>
            <p style={{ fontSize: 'var(--fs-display)', fontWeight: 'var(--fw-strong)', color: 'var(--accent-red)', lineHeight: 1 }}>{stumbles.length}</p>
          </div>
          <div style={{ width: '1px', background: 'var(--glass-border)', alignSelf: 'stretch' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 'var(--fs-secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Avg. Accuracy</p>
            <p style={{ fontSize: 'var(--fs-display)', fontWeight: 'var(--fw-strong)', color: averageAccuracy >= 80 ? 'var(--accent-emerald)' : 'var(--accent-gold)', lineHeight: 1 }}>{averageAccuracy}%</p>
          </div>
        </div>

        {/* Stumbles List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--fs-view)', fontWeight: '800', color: 'var(--text-primary)' }}>Your Weaknesses</h2>
            {stumbles.length > 0 && (
              <button onClick={clearStumbles} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--fs-secondary)', fontWeight: '700', cursor: 'pointer' }}>
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <AnimatePresence>
              {groupedStumbles.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
                  <CheckCircle size={48} color="var(--accent-emerald)" style={{ marginBottom: 'var(--space-4)' }} />
                  <h3 style={{ fontSize: 'var(--fs-page)', fontWeight: '800', color: 'var(--text-primary)' }}>No Stumbles Recorded</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '300px', margin: '0.5rem auto 0' }}>Your mistake book is empty! Use the Smart Musaffa mode to track your recitation accuracy.</p>
                </motion.div>
              ) : (
                groupedStumbles.map((group) => (
                  <motion.div key={group.surahNumber} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-view)', fontWeight: 'var(--fw-strong)', color: 'var(--accent-gold)' }}>
                          {group.surahNumber}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 'var(--fs-card)', fontWeight: '700', color: 'var(--text-primary)' }}>{group.surahName}</h3>
                          <p style={{ fontSize: 'var(--fs-secondary)', color: 'var(--accent-red)', fontWeight: '700' }}>{group.ayahs.length} mistake{group.ayahs.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => handlePractice(group.surahNumber, group.ayahs)} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-gold-soft)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)',
                        fontWeight: '800', fontSize: 'var(--fs-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                      }} className="hover-scale">
                        <BrainCircuit size={15} /> Practice
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {group.ayahs.map(ayah => (
                        <div key={ayah.number} style={{
                          padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-accent)',
                          border: 'var(--border-hairline)', fontSize: 'var(--fs-secondary)', fontWeight: '700',
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
