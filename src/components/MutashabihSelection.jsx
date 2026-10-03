import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, CheckSquare, Square, Zap, CircleHelp } from 'lucide-react';
import { buildSessionCards } from '../utils/mutashabihatParser';

const MutashabihSelection = ({ surahs, waqarData, quranAr, setView, setMultiSurahSession }) => {
  const [selectedSurahs, setSelectedSurahs] = useState(new Set());

  const availableSurahs = useMemo(() => {
    if (!surahs || !waqarData) return [];
    return surahs.filter(s => waqarData[s.number] && waqarData[s.number].length > 0);
  }, [surahs, waqarData]);

  // Precompute the true number of valid questions for each available surah
  const questionCounts = useMemo(() => {
    if (!quranAr || !surahs || availableSurahs.length === 0) return {};
    const counts = {};
    availableSurahs.forEach(s => {
      const cards = buildSessionCards(waqarData[s.number], s.number, quranAr, surahs);
      counts[s.number] = cards.length;
    });
    return counts;
  }, [availableSurahs, waqarData, quranAr, surahs]);

  const handleToggle = (surahNum) => {
    const newSet = new Set(selectedSurahs);
    if (newSet.has(surahNum)) {
      newSet.delete(surahNum);
    } else {
      newSet.add(surahNum);
    }
    setSelectedSurahs(newSet);
  };

  const handleSelectAll = () => {
    if (selectedSurahs.size === availableSurahs.length) {
      setSelectedSurahs(new Set());
    } else {
      setSelectedSurahs(new Set(availableSurahs.map(s => s.number)));
    }
  };

  const handleStartQuiz = () => {
    if (selectedSurahs.size === 0) return;
    // Build multiSurahData: array of { surahNum, entries }
    const multiSurahData = Array.from(selectedSurahs).map(num => ({
      surahNum: num,
      entries: waqarData[num] || []
    }));
    setMultiSurahSession(multiSurahData);
    setView('mutashabihat-multi-session');
  };

  const allSelected = availableSurahs.length > 0 && selectedSurahs.size === availableSurahs.length;

  const totalQuestionsSelected = useMemo(() => {
    let total = 0;
    selectedSurahs.forEach(num => {
      if (questionCounts[num]) total += questionCounts[num];
    });
    return total;
  }, [selectedSurahs, questionCounts]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Header — full-bleed top-level bar, identical to the Audio Manager,
          Surah Detail and Mistake Book headers. The global `<Header />` is
          suppressed for this view (see `VIEWS_WITHOUT_GLOBAL_HEADER` in App),
          so this is the page's only header and pins at `top: 0`, breaking out of
          `.app-container` (`100vw` plus a centred negative margin) so its
          background and hairline span the whole viewport; `.app-container`
          restores the standard page gutter. */}
      {/* This bar previously carried a hardcoded `rgba(10,10,15,0.92)`
          background, which stayed near-black in light mode while its title and
          subtitle used the theme tokens — `--text-primary` is dark on the light
          palette, so the text disappeared into the bar. Every other local header
          uses `var(--bg-primary)`, which adapts per theme; this one does too now.
          The row is also single-line for the same reason as the Mistake Book's:
          a two-line title block made the bar taller than the global header's, so
          the subtitle moved down into the body. */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 'var(--z-header)',
        width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
        backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)',
      }}>
        <div className="app-container">
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button onClick={() => setView('list')} className="icon-btn" aria-label="Back" title="Back to home">
                <ChevronLeft size={18} />
              </button>
              {/* `--fs-view` (1rem) rather than `--fs-page` (1.25rem): this title
                  sits beside a Select All control on narrow screens, so it steps
                  down one token to keep the row from wrapping. The glyph drops to
                  16px to stay in proportion with the smaller text. */}
              <h1 style={{
                fontSize: 'var(--fs-view)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)',
                margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              }}>
                <CircleHelp size={16} color="var(--accent-gold)" /> Mutashabih Quiz
              </h1>
            </div>
            <button onClick={handleSelectAll} style={{
              padding: '0.4rem 0.8rem', borderRadius: '8px', flexShrink: 0,
              border: 'var(--border-hairline)', background: 'var(--bg-accent)',
              color: 'var(--text-secondary)', fontSize: 'var(--fs-meta)', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </header>

      {/* Main List */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* Carried over from the header's old second line, which had to leave
              the header to keep it single-line. */}
          <p style={{
            fontSize: 'var(--fs-label)', color: 'var(--text-secondary)',
            margin: 0, paddingBottom: 'var(--space-2)',
          }}>
            Select Surahs to include
          </p>
          {availableSurahs.map(s => {
            const isSelected = selectedSurahs.has(s.number);
            return (
              <button key={s.number} onClick={() => handleToggle(s.number)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                border: '1px solid', borderColor: isSelected ? 'var(--accent-gold)' : 'var(--glass-border)',
                background: isSelected ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                textAlign: 'left', transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'var(--gold-gradient)' : 'var(--bg-primary)',
                    color: isSelected ? 'var(--text-on-gold)' : 'var(--text-muted)',
                    fontSize: 'var(--fs-secondary)', fontWeight: 800
                  }}>
                    {s.number}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--fs-card)', fontWeight: 700, color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)', margin: 0 }}>
                      {s.englishName}
                    </h3>
                    <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', margin: 0 }}>
                      {s.englishNameTranslation}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{
                    fontSize: 'var(--fs-label)',
                    fontWeight: 700,
                    color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)',
                    background: isSelected ? 'rgba(212,175,55,0.1)' : 'var(--bg-primary)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    {questionCounts[s.number] || 0} Qs
                  </span>
                  {isSelected && <Check size={18} color="var(--accent-gold)" />}
                </div>
              </button>
            );
          })}
          {availableSurahs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
              No Mutashabihat data available.
            </div>
          )}
        </div>
      </main>

      {/* Footer Action */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: 'var(--space-4)', background: 'linear-gradient(to top, var(--bg-primary) 50%, transparent)',
        display: 'flex', justifyContent: 'center', zIndex: 'var(--z-header)'
      }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <button onClick={handleStartQuiz} disabled={selectedSurahs.size === 0} style={{
            width: '100%', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
            background: 'var(--gold-gradient)', color: 'var(--text-on-gold)', border: 'none',
            fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: '0.05em',
            cursor: selectedSurahs.size > 0 ? 'pointer' : 'not-allowed',
            opacity: selectedSurahs.size > 0 ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
            boxShadow: '0 4px 14px var(--accent-gold-soft)'
          }}>
            <Zap size={18} />
            Start Quiz ({selectedSurahs.size} Selected)
          </button>
          {selectedSurahs.size > 1 && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total: {totalQuestionsSelected} Questions
              </span>
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
};

export default MutashabihSelection;
