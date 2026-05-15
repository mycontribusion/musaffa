import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  setPartnerSubView,
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

  if (subView === 'quiz') {
    const currentQuestion = questions[currentQuizIndex];
    const progress = ((currentQuizIndex + 1) / questions.length) * 100;

    return (
      <motion.div 
        key={currentQuestion.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen pt-12 pb-40 px-4 flex flex-col items-center"
      >
        {/* Immersive Progress Header */}
        <div className="w-full max-w-3xl mb-12 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-gold/80 mb-1 flex items-center gap-2">
                <Target size={12} className="text-accent-gold" />
                {typeLabels[activeQuizType] || 'Mutashabihat Quiz'}
              </span>
              <h3 className="text-white font-bold text-lg">Question {currentQuizIndex + 1} of {questions.length}</h3>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 block">Current Score</span>
                <span className="text-xl font-black text-emerald-400 tabular-nums">{quizScore}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                <Trophy size={20} className="text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05] p-[2px]">
            <motion.div 
              className="h-full bg-gradient-to-r from-accent-gold to-emerald-400 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
              initial={{ width: 0 }} 
              animate={{ width: `${progress}%` }} 
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
          </div>
        </div>

        {/* Question Area */}
        <div className="w-full max-w-4xl space-y-12">
          <div className="text-center space-y-6">
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl md:text-4xl font-black text-white leading-tight px-4"
            >
              {currentQuestion.question}
            </motion.h2>
            
            <AnimatePresence mode="wait">
              {currentQuestion.type === 'sequence' && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-block relative"
                >
                  <div className="absolute inset-0 bg-accent-gold/10 blur-3xl rounded-full" />
                  <div className="glass-card relative p-8 md:p-12 border-accent-gold/20 bg-accent-gold/5 max-w-2xl mx-auto rounded-[2.5rem]">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-gold text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full">
                      The Context Verse
                    </span>
                    <p className="arabic-text text-3xl md:text-4xl text-white/90 leading-[2]">
                      {currentQuestion.contextVerse}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {currentQuestion.options.map((opt, i) => {
              const isSelected = quizFeedback !== null;
              const isCorrect = opt.isCorrect;
              const isWrongSelection = isSelected && !isCorrect && quizFeedback === 'wrong';
              
              return (
                <motion.button 
                  key={opt.globalId || i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  disabled={isSelected}
                  onClick={() => handleQuizAnswer(opt)} 
                  className={`
                    group relative p-8 md:p-12 rounded-[2.5rem] border transition-all duration-500
                    flex flex-col items-center justify-center gap-8 overflow-hidden
                    ${!isSelected ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] hover:scale-[1.01]' : ''}
                    ${isSelected && isCorrect ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.1)]' : ''}
                    ${isSelected && !isCorrect ? 'opacity-40 grayscale-[0.5] border-white/[0.05]' : ''}
                  `}
                >
                  {/* Subtle Background Particle */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16 group-hover:bg-accent-gold/10 transition-colors" />

                  {/* Identification Label (Revealed on selection) */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute top-6 left-8 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'bg-emerald-400 text-slate-950' : 'bg-red-500/20 text-red-400'}`}
                      >
                        Surah {opt.surahName}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="arabic-text text-2xl md:text-3xl text-center leading-[2] text-white/90 group-hover:text-white transition-colors">
                    {opt.text}
                  </p>

                  {/* Status Icon */}
                  <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    {isSelected && isCorrect && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                        <CheckCircle2 size={48} />
                      </motion.div>
                    )}
                    {isSelected && !isCorrect && (
                      <XCircle size={32} className="text-white/20" />
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
              className="fixed bottom-12 left-4 right-4 md:left-auto md:right-12 md:w-96 z-[200]"
            >
              <div className={`p-8 rounded-[2.5rem] border backdrop-blur-2xl shadow-2xl ${quizFeedback === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${quizFeedback === 'correct' ? 'bg-emerald-400 text-slate-950' : 'bg-red-400 text-slate-950'}`}>
                    {quizFeedback === 'correct' ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                  </div>
                  <div className="space-y-2">
                    <p className={`text-xs font-black uppercase tracking-[0.2em] ${quizFeedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {quizFeedback === 'correct' ? 'Brilliant Discovery' : 'Subtle Difference'}
                    </p>
                    <p className="text-white font-bold leading-relaxed text-sm">
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
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="w-full max-w-lg space-y-12 text-center">
          <div className="relative inline-block">
            {/* Animated Glow Background */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ repeat: Infinity, duration: 10 }}
              className={`absolute inset-0 blur-[100px] opacity-30 ${isPassing ? 'bg-emerald-400' : 'bg-accent-gold'}`} 
            />
            
            <div className="relative z-10 w-48 h-48 rounded-[4rem] bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl">
              <span className="text-5xl font-black text-white tabular-nums">{quizScore}</span>
              <div className="h-[2px] w-12 bg-white/20 my-2" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Perfect Marks</span>
            </div>

            {isPassing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-xl"
              >
                <Sparkles size={24} />
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white leading-tight">
              {isPassing ? 'Scholarship Attained' : 'Diligent Revision Needed'}
            </h2>
            <p className="text-slate-400 font-medium px-8">
              You correctly identified <span className="text-white font-black">{percentage}%</span> of the complex similarities in this session.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 px-4">
            <button 
              onClick={() => startQuiz(activeQuizType)} 
              className="group relative h-20 bg-emerald-400 text-slate-950 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 flex items-center justify-center gap-3">
                <RotateCcw size={18} />
                Try Mastery Again
              </span>
            </button>

            <button 
              onClick={() => setView('detail')} 
              className="h-20 bg-white/[0.03] border border-white/[0.1] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-white/[0.08] transition-all flex items-center justify-center gap-3"
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
