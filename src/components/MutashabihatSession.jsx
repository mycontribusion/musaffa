import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, XCircle, RotateCcw, SquareSquare } from 'lucide-react';
import { buildSessionCards } from '../utils/mutashabihatParser';

const OptionBtn = ({ opt, answered, selected, onClick }) => {
  const correct = answered && opt.isCorrect;
  const wrong = answered && selected && !opt.isCorrect;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      disabled={answered}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '1.5rem 1.25rem',
        paddingRight: '3.5rem',
        borderRadius: '1.25rem',
        border: correct ? '1px solid #34d399'
          : wrong ? '1px solid rgba(239,68,68,0.4)'
            : '1px solid var(--glass-border)',
        background: correct ? 'rgba(52,211,153,0.1)'
          : wrong ? 'rgba(239,68,68,0.06)'
            : 'var(--bg-accent)',
        cursor: answered ? 'default' : 'pointer',
        textAlign: 'right',
        position: 'relative',
        transition: 'all 0.35s',
      }}
    >
      <span style={{
        display: 'block',
        fontSize: '0.5rem', fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.2em',
        color: correct ? '#34d399' : 'rgba(255,255,255,0.3)',
        marginBottom: '0.4rem',
      }}>
        {/* {opt.surahName} · {opt.surah}:{opt.ayah} */}
      </span>
      <p className="arabic-text" style={{
        fontSize: 'clamp(1.3rem, 3.8vw, 1.9rem)',
        lineHeight: 1.85, color: correct ? 'var(--text-primary)'
          : wrong ? 'var(--text-muted)' : 'var(--text-primary)',
        margin: 0,
      }}>
        {opt.text}
      </p>
      {answered && (
        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
          {opt.isCorrect
            ? <CheckCircle2 size={22} color="#34d399" />
            : selected ? <XCircle size={22} color="rgba(239,68,68,0.6)" /> : null}
        </span>
      )}
    </motion.button>
  );
};

// multiSurahData: optional array of { surahNum, entries } for cross-surah sessions
const MutashabihatSession = ({ surah, allSurahEntries, quranAr, surahs, onClose, multiSurahData }) => {
  const [sessionKey, setSessionKey] = useState(0);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [answersHistory, setAnswersHistory] = useState([]);

  const cards = useMemo(() => {
    if (!quranAr || !surahs) return [];
    if (multiSurahData?.length) {
      // Build cards per surah then shuffle all together
      const all = [];
      multiSurahData.forEach(({ surahNum, entries }) => {
        if (entries?.length) {
          all.push(...buildSessionCards(entries, surahNum, quranAr, surahs));
        }
      });
      return all.sort(() => Math.random() - 0.5);
    }
    if (!allSurahEntries?.length) return [];
    return buildSessionCards(allSurahEntries, surah.number, quranAr, surahs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSurahEntries, surah?.number, quranAr, surahs, sessionKey, multiSurahData]);

  const card = cards[idx];
  const total = cards.length;
  const progress = total ? ((idx + 1) / total) * 100 : 0;

  const handleAnswer = (opt) => {
    if (answered) return;
    setAnswered(true);
    setSelected(opt);
    const isCorrect = opt.isCorrect;
    if (isCorrect) setScore(s => s + 1);
    
    setAnswersHistory(prev => [...prev, { card: cards[idx], selectedOpt: opt, isCorrect }]);

    setTimeout(() => {
      if (idx + 1 >= total) { setDone(true); return; }
      setIdx(i => i + 1);
      setAnswered(false);
      setSelected(null);
    }, 2000);
  };

  const restart = () => {
    setSessionKey(k => k + 1);
    setIdx(0); setAnswered(false);
    setSelected(null); setScore(0); setDone(false);
    setAnswersHistory([]);
  };

  const displayTitle = multiSurahData
    ? `${multiSurahData.length} Surahs · Mutashabihat`
    : `${surah?.englishName} · Mutashabihat`;

  // Done screen uses displayTitle for accuracy label
  const accuracyLabel = multiSurahData ? `${multiSurahData.length} Surahs` : surah?.englishName;

  if (done) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{
          width: 110, height: 110, borderRadius: '2rem', margin: '0 auto 2rem',
          background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-gold)' }}>{score}</span>
          <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>/ {total}</span>
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {score >= Math.ceil(total * 0.8) ? 'Mastery Achieved' : 'Keep Revising'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{Math.round(score / total * 100)}%</strong> accuracy on {accuracyLabel} Mutashabihat
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={restart} style={{
            padding: '0.9rem', borderRadius: '0.9rem', background: 'var(--accent-gold)',
            border: 'none', color: '#0a0a0f', fontWeight: 900, fontSize: '0.7rem',
            textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <RotateCcw size={15} /> Try Again
          </button>
          <button onClick={onClose} style={{
            padding: '0.9rem', borderRadius: '0.9rem',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.7rem',
            textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
          }}>
            {multiSurahData ? 'Back to Selection' : 'Back to Surah'}
          </button>
        </div>

        {/* History Breakdown */}
        {answersHistory.length > 0 && (
          <div style={{ marginTop: '3rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>
              Quiz Review
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {answersHistory.map((hist, i) => (
                <div key={i} style={{
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: '1rem', padding: '1.25rem'
                }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Q{i + 1}: {hist.card.question}
                  </p>
                  <p className="arabic-text" style={{ fontSize: '1.2rem', textAlign: 'right', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {hist.card.contextVerse.text}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {hist.card.options.map((o, j) => {
                      const isChosen = hist.selectedOpt.surah === o.surah && hist.selectedOpt.ayah === o.ayah;
                      const isCorrect = o.isCorrect;
                      return (
                        <div key={j} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.75rem', borderRadius: '0.5rem',
                          background: isCorrect ? 'rgba(52,211,153,0.1)' : (isChosen && !isCorrect ? 'rgba(239,68,68,0.1)' : 'var(--bg-accent)'),
                          border: isCorrect ? '1px solid rgba(52,211,153,0.3)' : (isChosen && !isCorrect ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent')
                        }}>
                          {isCorrect ? <CheckCircle2 size={16} color="#34d399" /> : (isChosen && !isCorrect ? <XCircle size={16} color="#ef4444" /> : <div style={{width: 16}} />)}
                          <div style={{ flex: 1 }}>
                            <p className="arabic-text" style={{ fontSize: '1.1rem', textAlign: 'right', margin: 0, color: isCorrect ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {o.text}
                            </p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem', textAlign: 'left' }}>
                              {o.surahName} · {o.surah}:{o.ayah}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Attribution Footer */}
        <div style={{ marginTop: '2.5rem', opacity: 0.6 }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Mutashabihat dataset courtesy of{' '}
            <a 
              href="https://github.com/Waqar144/Quran_Mutashabihat_Data" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: '700' }}
            >
              Waqar144
            </a>
          </p>
        </div>
      </div>
    </motion.div>
  );


  if (!card) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: 'var(--text-muted)' }}>No questions generated for {displayTitle}.</p>
      <button onClick={onClose} style={{ color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>← Go Back</button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0.8rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
            border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              {displayTitle}
            </h1>
            <p style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent-gold)', opacity: 0.65, margin: 0 }}>
              {idx + 1} / {total}
            </p>
          </div>
          <button onClick={restart} style={{
            width: 36, height: 36, borderRadius: '10px',
            border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RotateCcw size={14} />
          </button>
          <button onClick={() => setDone(true)} title="End Quiz Early" style={{
            width: 36, height: 36, borderRadius: '10px',
            border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SquareSquare size={14} />
          </button>
          <div style={{
            padding: '4px 14px', borderRadius: '8px',
            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
            fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent-gold)',
          }}>
            {score}
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 55 }}
            style={{ height: '100%', background: 'linear-gradient(90deg,var(--accent-gold),#34d399)', borderRadius: 99 }} />
        </div>
      </header>

      {/* Card */}
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div key={card.id}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>

            {/* Context verse */}
            <div style={{
              borderRadius: '1.5rem', padding: '1.75rem',
              border: '1px solid rgba(212,175,55,0.15)',
              background: 'rgba(212,175,55,0.03)',
              marginBottom: '1.75rem',
            }}>
              <span style={{
                display: 'block', fontSize: '0.5rem', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.25em',
                color: 'rgba(212,175,55,0.6)', marginBottom: '0.75rem',
              }}>
                {card.contextLabel}
              </span>
              <p className="arabic-text" style={{
                fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)',
                lineHeight: 1.9, textAlign: 'right',
                color: 'var(--text-secondary)', margin: 0,
              }}>
                {card.contextVerse.text}
              </p>
            </div>

            {/* Question */}
            <h2 style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 900,
              color: 'var(--text-primary)', textAlign: 'center',
              margin: '0 0 1.25rem', lineHeight: 1.4,
            }}>
              {card.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {card.options.map((opt) => (
                <OptionBtn
                  key={`${opt.surah}-${opt.ayah}`}
                  opt={opt}
                  answered={answered}
                  selected={selected === opt}
                  onClick={() => handleAnswer(opt)}
                />
              ))}
            </div>

            {/* Feedback hint */}
            <AnimatePresence>
              {answered && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    textAlign: 'center', marginTop: '1.25rem',
                    fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em',
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                  }}
                >
                  {selected?.isCorrect ? '✓ Correct' : '✗ Incorrect'} · {idx + 1 < total ? 'Next loading…' : 'Session complete'}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Attribution Footer */}
        <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.5 }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Mutashabihat dataset courtesy of{' '}
            <a 
              href="https://github.com/Waqar144/Quran_Mutashabihat_Data" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: '700' }}
            >
              Waqar144
            </a>
          </p>
        </div>
      </main>
    </motion.div>
  );
};

export default MutashabihatSession;
