import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, CheckSquare, Square, Zap } from 'lucide-react';
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
      
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <button onClick={() => setView('list')} style={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Custom Mutashabih Quiz
          </h1>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0 }}>
            Select Surahs to include
          </p>
        </div>
        <button onClick={handleSelectAll} style={{
          padding: '0.4rem 0.8rem', borderRadius: '8px',
          border: '1px solid var(--glass-border)', background: 'var(--bg-accent)',
          color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
        }}>
          {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </header>

      {/* Main List */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {availableSurahs.map(s => {
            const isSelected = selectedSurahs.has(s.number);
            return (
              <button key={s.number} onClick={() => handleToggle(s.number)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                border: '1px solid', borderColor: isSelected ? 'var(--accent-gold)' : 'var(--glass-border)',
                background: isSelected ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                textAlign: 'left', transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'var(--accent-gold)' : 'var(--bg-primary)',
                    color: isSelected ? '#000' : 'var(--text-muted)',
                    fontSize: '0.75rem', fontWeight: 800
                  }}>
                    {s.number}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)', margin: 0 }}>
                      {s.englishName}
                    </h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                      {s.englishNameTranslation}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 700, 
                    color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)',
                    background: isSelected ? 'rgba(212,175,55,0.1)' : 'var(--bg-primary)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '99px'
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
        padding: '1rem', background: 'linear-gradient(to top, var(--bg-primary) 50%, transparent)',
        display: 'flex', justifyContent: 'center', zIndex: 100
      }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <button onClick={handleStartQuiz} disabled={selectedSurahs.size === 0} style={{
            width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)',
            background: 'var(--accent-gold)', color: '#000', border: 'none',
            fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
            cursor: selectedSurahs.size > 0 ? 'pointer' : 'not-allowed',
            opacity: selectedSurahs.size > 0 ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(212,175,55,0.2)'
          }}>
            <Zap size={18} />
            Start Quiz ({selectedSurahs.size} Selected)
          </button>
          {selectedSurahs.size > 1 && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
