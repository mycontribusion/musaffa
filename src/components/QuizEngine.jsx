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
        style={{ minHeight: '100vh', paddingTop: '3rem', paddingBottom: '10rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* Immersive Progress Header */}
        <div style={{ width: '100%', maxWidth: '48rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--accent-gold)', opacity: 0.8, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={12} style={{ color: 'var(--accent-gold)' }} />
                {typeLabels[activeQuizType] || 'Mutashabihat Quiz'}
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Question {currentQuizIndex + 1} of {questions.length}</h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent-emerald)', opacity: 0.6, display: 'block' }}>Current Score</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>{quizScore}</span>
              </div>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={20} style={{ color: 'var(--accent-emerald)' }} />
              </div>
            </div>
          </div>

          <div style={{ height: '0.5rem', width: '100%', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '2px' }}>
            <motion.div 
              style={{ height: '100%', background: `linear-gradient(to right, var(--accent-gold), var(--accent-emerald))`, borderRadius: '9999px', boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
              initial={{ width: 0 }} 
              animate={{ width: `${progress}%` }} 
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
          </div>
        </div>

        {/* Question Area */}
        <div style={{ width: '100%', maxWidth: '56rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.3, padding: '0 1rem' }}
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
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(251, 191, 36, 0.1)', filter: 'blur(48px)', borderRadius: '9999px' }} />
                  <div className="glass-card" style={{ position: 'relative', padding: 'clamp(2rem, 6vw, 3rem)', border: '1px solid rgba(251, 191, 36, 0.2)', maxWidth: '42rem', margin: '0 auto', borderRadius: '2.5rem', background: 'rgba(251, 191, 36, 0.05)' }}>
                    <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', padding: '0 1rem', background: 'var(--accent-gold)', color: '#0a0a0f', fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', borderRadius: '9999px' }}>
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
          <div style={{ display: 'grid', gap: '1.5rem' }}>
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
                    border: showCorrect ? '1px solid #34d399' : showWrong ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)',
                    background: showCorrect ? 'rgba(62, 211, 153, 0.15)' : showWrong ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-accent)',
                    cursor: isAnswered ? 'default' : 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2rem',
                    overflow: 'hidden',
                    transition: 'all 0.5s',
                    opacity: isAnswered && !isCorrect && !isThisSelected ? 0.5 : 1,
                  }}
                >
                  {/* Subtle Background Particle */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '8rem', height: '8rem', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(24px)', borderRadius: '9999px', transform: 'translateX(4rem) translateY(-4rem)' }} />

                  {/* Identification Label (Revealed on selection) */}
                  <AnimatePresence>
                    {isAnswered && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ position: 'absolute', top: '1.5rem', left: '2rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', background: isCorrect ? 'var(--accent-emerald)' : 'rgba(239, 68, 68, 0.2)', color: isCorrect ? '#0a0a0f' : 'rgba(239, 68, 68, 0.7)' }}
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
                      <XCircle size={32} style={{ color: 'rgba(239, 68, 68, 0.5)' }} />
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
              style={{ position: 'fixed', bottom: '3rem', left: '1rem', right: '1rem', zIndex: 200, maxWidth: '24rem', margin: '0 auto' }}
            >
              <div style={{ padding: '2rem', borderRadius: '2.5rem', border: '1px solid', background: quizFeedback === 'correct' ? 'rgba(62, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: quizFeedback === 'correct' ? 'var(--accent-emerald)' : 'var(--accent-red)', color: '#0a0a0f' }}>
                    {quizFeedback === 'correct' ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: quizFeedback === 'correct' ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
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
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      >
        <div style={{ width: '100%', maxWidth: '32rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Animated Glow Background */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ repeat: Infinity, duration: 10 }}
              style={{ position: 'absolute', inset: 0, filter: 'blur(100px)', opacity: 0.3, background: isPassing ? 'var(--accent-emerald)' : 'var(--accent-gold)' }}
            />
            
            <div style={{ position: 'relative', zIndex: 10, width: '12rem', height: '12rem', borderRadius: '4rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{quizScore}</span>
              <div style={{ height: '2px', width: '3rem', background: 'rgba(255, 255, 255, 0.2)', margin: '0.5rem 0' }} />
              <span style={{ fontSize: '0.625rem', fontWeight: 900, color: 'var(--text-primary)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.3em' }}>Perfect Marks</span>
            </div>

            {isPassing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }} 
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'absolute', top: '-1rem', right: '-1rem', width: '3rem', height: '3rem', background: 'var(--accent-emerald)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0f', boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.37)' }}
              >
                <Sparkles size={24} />
              </motion.div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {isPassing ? 'Scholarship Attained' : 'Diligent Revision Needed'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 500, padding: '0 2rem' }}>
              You correctly identified <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{percentage}%</span> of the complex similarities in this session.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '1rem', padding: '0 1rem' }}>
            <button 
              onClick={() => startQuiz(activeQuizType)} 
              style={{ position: 'relative', height: '5rem', background: 'var(--accent-emerald)', color: '#0a0a0f', borderRadius: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.6875rem', border: 'none', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.2)', transform: 'translateY(100%)', transition: 'transform 0.5s' }} />
              <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <RotateCcw size={18} />
                Try Mastery Again
              </span>
            </button>

            <button 
              onClick={() => setView('detail')} 
              style={{ height: '5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', borderRadius: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.6875rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
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
