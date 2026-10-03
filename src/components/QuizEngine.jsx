import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Target, Sparkles } from 'lucide-react';

const QuizEngine = ({
  subView,
  questions,
  currentQuizIndex,
  quizScore,
  quizFeedback,
  handleQuizAnswer,
  startQuiz,
  setView,
  activeQuizType
}) => {
  const typeLabels = {
    all: 'Mastery Challenge',
    beginnings: 'Verse Openings',
    endings: 'Verse Finales',
    'one-word': 'Subtle Distinctions',
    continue: 'Continuations',
    'which-surah': 'Surah Identification'
  };

  const [selectedOpt, setSelectedOpt] = useState(null);

  // Reset selected option when question changes
  useEffect(() => {
    setSelectedOpt(null);
  }, [currentQuizIndex]);

  // Scroll to top whenever a new question appears
  useEffect(() => {
    if (subView === 'quiz') {
      const resetScroll = () => window.scroll({ top: 0, left: 0, behavior: 'instant' });
      resetScroll();
      
      // Staggered backups for aggressive browser scroll restoration
      const t1 = setTimeout(resetScroll, 10);
      const t2 = setTimeout(resetScroll, 150);
      const t3 = setTimeout(resetScroll, 400);
      
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [currentQuizIndex, subView]);

  if (subView === 'quiz') {
    const currentQuestion = questions[currentQuizIndex];
    const progress = ((currentQuizIndex + 1) / questions.length) * 100;

    return (
      <motion.div 
        key={currentQuestion.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ minHeight: '100vh', paddingTop: 'var(--space-8)', paddingRight: 'var(--space-4)', paddingBottom: '10rem', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* Directional padding only: this declaration previously ended with the
            `padding` shorthand, which overrode the `paddingTop` /
            `paddingBottom` written just before it and silently flattened the
            whole box to --space-4. Same four intended values, no shorthand left
            to shadow them. */}
        {/* Immersive Progress Header */}
        <div style={{ width: '100%', maxWidth: '48rem', marginBottom: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--accent-gold)', opacity: 0.8, marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Target size={12} style={{ color: 'var(--accent-gold)' }} />
                {typeLabels[activeQuizType] || 'Mutashabihat Quiz'}
              </span>
              <h3 style={{ fontSize: 'var(--fs-view)', fontWeight: 700, color: 'var(--text-primary)' }}>Question {currentQuizIndex + 1} of {questions.length}</h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: 'var(--accent-emerald)', opacity: 0.6, display: 'block' }}>Current Score</span>
                <span style={{ fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--accent-emerald)' }}>{quizScore}</span>
              </div>
              <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={20} style={{ color: 'var(--accent-emerald)' }} />
              </div>
            </div>
          </div>

          <div style={{ height: '0.5rem', width: '100%', background: 'var(--bg-accent)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--glass-border)', padding: '2px' }}>
            <motion.div 
              style={{ height: '100%', background: `linear-gradient(to right, var(--accent-gold), var(--accent-emerald))`, borderRadius: 'var(--radius-full)', boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
              initial={{ width: 0 }} 
              animate={{ width: `${progress}%` }} 
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
          </div>
        </div>

        {/* Question Area */}
        <div style={{ width: '100%', maxWidth: '56rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', lineHeight: 1.3, padding: '0 1rem' }}
            >
              {currentQuestion.question}
            </motion.h2>
            
            <AnimatePresence mode="wait">
              {currentQuestion.type === 'sequence' && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ position: 'relative', display: 'inline-block' }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(251, 191, 36, 0.1)', filter: 'blur(48px)', borderRadius: 'var(--radius-full)' }} />
                  <div className="glass-card" style={{ position: 'relative', padding: 'clamp(2rem, 6vw, 3rem)', border: '1px solid rgba(251, 191, 36, 0.2)', maxWidth: '42rem', margin: '0 auto', borderRadius: '2.5rem', background: 'rgba(251, 191, 36, 0.05)' }}>
                    <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', padding: '0.2rem 1rem', background: 'var(--gold-gradient)', color: 'var(--text-on-gold)', fontSize: '0.65rem', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', borderRadius: 'var(--radius-full)' }}>
                      The Context Verse
                    </span>
                    <p className="arabic-text" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', lineHeight: 2, textAlign: 'right', color: 'var(--text-primary)' }}>
                      {currentQuestion.contextVerse}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Options Grid */}
          <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
            {currentQuestion.options.map((opt, i) => {
              const isAnswered = quizFeedback !== null;
              const isThisSelected = selectedOpt === opt;
              const isCorrect = opt.isCorrect;
              const showCorrect = isAnswered && isCorrect;
              const showWrong = isAnswered && isThisSelected && !isCorrect;
              
              return (
                <motion.button 
                  key={opt.globalId || i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  disabled={isAnswered}
                  onClick={() => { setSelectedOpt(opt); handleQuizAnswer(opt); }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    padding: 'clamp(2rem, 6vw, 3rem)',
                    borderRadius: '2.5rem',
                    border: showCorrect ? '1px solid #34d399' : showWrong ? '1px solid rgba(239, 68, 68, 0.4)' : 'var(--border-hairline)',
                    background: showCorrect ? 'rgba(62, 211, 153, 0.15)' : showWrong ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-accent)',
                    cursor: isAnswered ? 'default' : 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-6)',
                    overflow: 'hidden',
                    transition: 'all 0.5s',
                    opacity: isAnswered && !isCorrect && !isThisSelected ? 0.5 : 1,
                  }}
                >
                  {/* Subtle Background Particle */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(24px)', borderRadius: 'var(--radius-full)', transform: 'translateX(4rem) translateY(-4rem)' }} />

                  {/* Identification Label (Revealed on selection) */}
                  <AnimatePresence>
                    {isAnswered && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ position: 'absolute', top: '1.5rem', left: '2rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.625rem', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', background: isCorrect ? 'var(--accent-emerald)' : 'rgba(239, 68, 68, 0.2)', color: isCorrect ? '#ffffff' : 'rgba(239, 68, 68, 0.9)' }}
                      >
                        Surah {opt.surahName}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="arabic-text" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', lineHeight: 2, textAlign: 'center', color: showWrong ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {opt.text}
                  </p>

                  {/* Status Icon */}
                  <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)' }}>
                    {isAnswered && isCorrect && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: 'var(--accent-emerald)', filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.5))' }}>
                        <CheckCircle2 size={48} />
                      </motion.div>
                    )}
                    {showWrong && (
                      <XCircle size={32} style={{ color: 'var(--accent-red)' }} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Feedback Overlay */}
        <AnimatePresence>
          {quizFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              style={{ position: 'fixed', bottom: '3rem', left: '1rem', right: '1rem', zIndex: 'var(--z-fixed)', maxWidth: '24rem', margin: '0 auto' }}
            >
              <div style={{ padding: 'var(--space-6)', borderRadius: '2.5rem', border: quizFeedback === 'correct' ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid rgba(239, 68, 68, 0.25)', background: quizFeedback === 'correct' ? 'var(--glass-bg)' : 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: 'var(--glass-shadow)' }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: quizFeedback === 'correct' ? 'var(--accent-emerald)' : 'var(--accent-red)', color: '#ffffff' }}>
                    {quizFeedback === 'correct' ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <p style={{ fontSize: 'var(--fs-secondary)', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: quizFeedback === 'correct' ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
                      {quizFeedback === 'correct' ? 'Brilliant Discovery' : 'Subtle Difference'}
                    </p>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.5, fontSize: '0.875rem' }}>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (subView === 'quiz-result') {
    const percentage = Math.round((quizScore / questions.length) * 100);
    const isPassing = percentage >= 80;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}
      >
        <div style={{ width: '100%', maxWidth: '32rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Animated Glow Background */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ repeat: Infinity, duration: 10 }}
              style={{ position: 'absolute', inset: 0, filter: 'blur(100px)', opacity: 0.3, background: isPassing ? 'var(--accent-emerald)' : 'var(--accent-gold)' }}
            />
            
            <div style={{ position: 'relative', zIndex: 10, width: '12rem', height: '12rem', borderRadius: '4rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(24px)', boxShadow: 'var(--glass-shadow)' }}>
              <span style={{ fontSize: '3rem', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{quizScore}</span>
              <div style={{ height: '2px', width: '3rem', background: 'var(--glass-border)', margin: '0.5rem 0' }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 'var(--fw-strong)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Marks</span>
            </div>

            {isPassing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }} 
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'absolute', top: '-1rem', right: '-1rem', width: '3rem', height: '3rem', background: 'var(--accent-emerald)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.37)' }}
              >
                <Sparkles size={24} />
              </motion.div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {isPassing ? 'Scholarship Attained' : 'Diligent Revision Needed'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 500, padding: '0 2rem' }}>
              You correctly identified <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--fw-strong)' }}>{percentage}%</span> of the complex similarities in this session.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-4)', padding: '0 1rem' }}>
            <button 
              onClick={() => startQuiz(activeQuizType)} 
              style={{ position: 'relative', height: '5rem', background: 'var(--accent-emerald)', color: '#ffffff', borderRadius: 'var(--radius-xl)', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontSize: '0.6875rem', border: 'none', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.2)', transform: 'translateY(100%)', transition: 'transform 0.5s' }} />
              <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                <RotateCcw size={18} />
                Try Mastery Again
              </span>
            </button>

            <button 
              onClick={() => setView('detail')} 
              style={{ height: '5rem', background: 'var(--bg-accent)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xl)', fontWeight: 'var(--fw-strong)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontSize: '0.6875rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}
            >
              <ArrowRight size={18} />
              Return to Surah
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default QuizEngine;
