import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, XCircle, RotateCcw, CircleHelp } from 'lucide-react';
import { buildSessionCards } from '../utils/mutashabihatParser';

/**
 * Standard "stop" transport glyph: a circle with a *filled* square inside.
 *
 * lucide's `CircleStop` cannot supply this. Its icon node is a bare
 * `<rect x="9" y="9" width="6" height="6" rx="1" />` with no `fill`, so it
 * renders as an outlined square — not the solid one on a real transport bar —
 * and lucide v1.14 ships no filled variant (`circle-stop`, `stop-circle` and
 * `square-stop` are all outline-only). The previously used `SquareSquare` was
 * worse: two overlapping squares read as "copy/duplicate".
 *
 * Geometry and stroke conventions deliberately mirror lucide's own `circle-stop`
 * node (24 viewBox, `currentColor`, strokeWidth 2, round caps/joins) so it sits
 * consistently beside the other icons in this header.
 */
const StopCircleIcon = ({ size = 15, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <circle cx="12" cy="12" r="10" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

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
            : 'var(--border-hairline)',
        background: correct ? 'rgba(52,211,153,0.1)'
          : wrong ? 'rgba(239,68,68,0.06)'
            : 'var(--bg-accent)',
        cursor: answered ? 'default' : 'pointer',
        textAlign: 'right',
        position: 'relative',
        transition: 'all 0.35s',
      }}
    >
      {/* The surah/verse reference that used to sit above each option
          ("Al-Baqarah · 2:255") is gone for the same reason as `contextLabel`:
          it disclosed which verse an option was drawn from, which is the answer
          the question is asking for. The whole span is removed rather than left
          empty, since it was still contributing its own `marginBottom` and
          uppercase styling to every option. */}
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

  /* Return to the top of the page on every question change. A long option set
     leaves the reader scrolled partway down the card, and the next question can
     be taller or shorter, so without this the new card can render off-screen —
     especially on the first question of a restart, where `idx` returns to 0 from
     deep in the list. Keying on `idx` covers both the "next question" advance and
     `restart()`, and the initial mount is a harmless no-op at scroll position 0.

     The document is the scroll container here (the page has no overflow wrapper),
     so `window.scrollTo` is the right target. Behavior is smooth, matching the
     card's own 0.2s enter/exit transition. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idx]);

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
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 'var(--space-6)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{
          width: 110, height: 110, borderRadius: 'var(--radius-xl)', margin: '0 auto 2rem',
          background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 'var(--fw-strong)', color: 'var(--accent-gold)' }}>{score}</span>
          <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: 'var(--text-muted)' }}>/ {total}</span>
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          {score >= Math.ceil(total * 0.8) ? 'Mastery Achieved' : 'Keep Revising'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{Math.round(score / total * 100)}%</strong> accuracy on {accuracyLabel} Mutashabihat
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button onClick={restart} style={{
            padding: '0.9rem', borderRadius: '0.9rem', background: 'var(--gold-gradient)',
            border: 'none', color: 'var(--text-on-gold)', fontWeight: 'var(--fw-strong)', fontSize: 'var(--fs-meta)',
            textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <RotateCcw size={15} /> Try Again
          </button>
          <button onClick={onClose} style={{
            padding: '0.9rem', borderRadius: '0.9rem',
            background: 'var(--glass-bg)', border: 'var(--border-hairline)',
            color: 'var(--text-muted)', fontWeight: 800, fontSize: 'var(--fs-meta)',
            textTransform: 'uppercase', letterSpacing: '0.15em', cursor: 'pointer',
          }}>
            {multiSurahData ? 'Back to Selection' : 'Back to Surah'}
          </button>
        </div>

        {/* History Breakdown */}
        {answersHistory.length > 0 && (
          <div style={{ marginTop: 'var(--space-8)', textAlign: 'left' }}>
            <h3 style={{ fontSize: 'var(--fs-view)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', marginBottom: 'var(--space-5)', textAlign: 'center' }}>
              Quiz Review
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {answersHistory.map((hist, i) => (
                <div key={i} style={{
                  background: 'var(--glass-bg)', border: 'var(--border-hairline)',
                  borderRadius: 'var(--radius-md)', padding: '1.25rem'
                }}>
                  <p style={{ fontSize: 'var(--fs-body-sm)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                    Q{i + 1}: {hist.card.question}
                  </p>
                  <p className="arabic-text" style={{ fontSize: '1.2rem', textAlign: 'right', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    {hist.card.contextVerse.text}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {hist.card.options.map((o, j) => {
                      const isChosen = hist.selectedOpt.surah === o.surah && hist.selectedOpt.ayah === o.ayah;
                      const isCorrect = o.isCorrect;
                      return (
                        <div key={j} style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                          padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                          background: isCorrect ? 'rgba(52,211,153,0.1)' : (isChosen && !isCorrect ? 'rgba(239,68,68,0.1)' : 'var(--bg-accent)'),
                          border: isCorrect ? '1px solid rgba(52,211,153,0.3)' : (isChosen && !isCorrect ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent')
                        }}>
                          {isCorrect ? <CheckCircle2 size={16} color="#34d399" /> : (isChosen && !isCorrect ? <XCircle size={16} color="#ef4444" /> : <div style={{width: 16}} />)}
                          <div style={{ flex: 1 }}>
                            <p className="arabic-text" style={{ fontSize: '1.1rem', textAlign: 'right', margin: 0, color: isCorrect ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {o.text}
                            </p>
                            <p style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem', textAlign: 'left' }}>
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
          <p style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
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

      {/* Header — full-bleed top-level bar, identical to the Audio Manager,
          Surah Detail, Mistake Book and Mutashabih Selection headers. The global
          `<Header />` is suppressed for this view (see `VIEWS_WITHOUT_GLOBAL_HEADER`
          in App), so this is the page's only header and pins at `top: 0`, breaking
          out of `.app-container` so its background and hairline span the whole
          viewport; `.app-container` restores the standard page gutter.

          The row is deliberately single-line. It used to stack the title above a
          separate uppercase `n / total` line (plus a `0.6rem` gap), which made the
          bar taller than the global header's and left it floating below it.

          The title itself — `displayTitle`, i.e. "12 Surahs · Mutashabihat" or
          "Al-Baqarah · Mutashabihat" — has been reduced to just the word "Quiz". The
          surah count repeated what the user had already chosen on the selection
          screen and never changed mid-quiz, and it was the only part wide enough to
          squeeze the score and action buttons on a narrow phone. So the bar now
          reads "Quiz · 3/12" instead: enough to identify the screen, short enough to
          stay on one line. The counter carries an `aria-label` so the heading still
          announces meaningfully even though its visible text is only a fraction.
          `displayTitle` itself is still used by the empty state further down, so the
          variable stays. */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 'var(--z-header)',
        width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
        backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)',
      }}>
        <div className="app-container">
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
              <button onClick={onClose} className="icon-btn" aria-label="Back" title="Back to selection">
                <ChevronLeft size={18} />
              </button>
              {/* Visible text is "Quiz" plus the counter; the `aria-label`
                  carries the full heading so the bar announces as
                  "Quiz, question 3 of 12" rather than a bare "3/12". */}
              <h1
                aria-label={`Quiz, question ${idx + 1} of ${total}`}
                style={{
                  margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* `CircleHelp` (lucide's current name for the classic
                    HelpCircle glyph) reads as "quiz" far more readily than the
                    circuit-brain `BrainCircuit`, which is why this bar no longer
                    matches the feature glyph used on the entry points. */}
                <CircleHelp size={16} color="var(--accent-gold)" style={{ flexShrink: 0 }} aria-hidden="true" />
                <span aria-hidden="true" style={{
                  fontSize: 'var(--fs-view)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)',
                }}>
                  Quiz
                </span>
                <span aria-hidden="true" style={{
                  fontSize: 'var(--fs-meta)', fontWeight: 700, color: 'var(--accent-gold)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  · {idx + 1}/{total}
                </span>
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                background: 'var(--accent-gold-soft)', border: '1px solid rgba(212,175,55,0.3)',
                fontSize: 'var(--fs-meta)', fontWeight: 'var(--fw-strong)', color: 'var(--accent-gold)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {score}
              </span>
              <button onClick={restart} className="icon-btn" aria-label="Restart quiz" title="Restart quiz">
                <RotateCcw size={15} />
              </button>
              {/* `StopCircleIcon` is the standard transport stop mark — a circle
                  with a solid square inside. Distinct from the `XCircle` used for
                  a wrong answer below, since the inner mark is a square, not a
                  cross. See the component's note on why lucide's `CircleStop`
                  could not be used. */}
              <button onClick={() => setDone(true)} className="icon-btn" title="End Quiz Early" aria-label="End quiz early">
                <StopCircleIcon size={15} />
              </button>
            </div>
          </div>
        </div>
        {/* Progress strip — kept full-bleed (outside `.app-container`) so it runs
            the width of the viewport rather than stopping at the 1000px gutter. */}
        <div style={{ height: 3, background: 'var(--bg-accent)', overflow: 'hidden' }} aria-hidden="true">
          <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 55 }}
            style={{ height: '100%', background: 'linear-gradient(90deg,var(--accent-gold),#34d399)' }} />
        </div>
      </header>

      {/* Card */}
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div key={card.id}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>

            {/* Context verse — no verse reference above it. The card used to
                render `card.contextLabel` ("Al-Baqarah · 2:255") here, which pinned
                down the exact ayah preceding the blank the question asks the
                test-taker to fill, so the answer could be read off rather than
                recalled. The surah is still named — in the question text below —
                so only the ayah number was removed. The parser no longer emits the
                field. */}
            <div style={{
              borderRadius: 'var(--radius-lg)', padding: '1.75rem',
              border: '1px solid rgba(212,175,55,0.25)',
              background: 'var(--accent-gold-soft)',
              marginBottom: '1.75rem',
            }}>
              <p className="arabic-text" style={{
                fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)',
                lineHeight: 1.9, textAlign: 'right',
                color: 'var(--text-primary)', margin: 0,
              }}>
                {card.contextVerse.text}
              </p>
            </div>

            {/* Question */}
            <h2 style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 'var(--fw-strong)',
              color: 'var(--text-primary)', textAlign: 'center',
              margin: '0 0 1.25rem', lineHeight: 1.4,
            }}>
              {card.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
                    fontSize: 'var(--fs-label)', fontWeight: 800, letterSpacing: '0.1em',
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
        <div style={{ textAlign: 'center', marginTop: 'var(--space-10)', opacity: 0.5 }}>
          <p style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)' }}>
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
