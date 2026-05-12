import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

const QuizEngine = ({
  subView,
  mutashabihat,
  currentQuizIndex,
  quizScore,
  quizFeedback,
  handleQuizAnswer,
  startQuiz,
  setPartnerSubView,
}) => {
  if (subView === 'quiz') {
    const currentQuestion = mutashabihat[currentQuizIndex];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pt-4 max-w-2xl mx-auto pb-40">
        <div className="flex items-center justify-between px-4">
          <button onClick={() => setPartnerSubView('menu')} className="p-3 bg-white/[0.05] rounded-2xl hover:bg-white/[0.1] transition-all text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Question</span>
            <span className="text-sm font-bold text-white">{currentQuizIndex + 1} / {mutashabihat.length}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl border border-white/[0.05] flex items-center justify-center text-xs font-bold text-amber-400">
            {quizScore}
          </div>
        </div>

        <div className="glass-card p-10 md:p-16 space-y-12 text-center border-white/[0.05] relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/60">Identify the Surah</span>
            <div className="arabic-text text-3xl md:text-5xl leading-[1.8] text-white">
              {currentQuestion.verse}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-white/[0.05] w-full">
            <motion.div 
              className="h-full bg-amber-400" 
              initial={{ width: 0 }} 
              animate={{ width: `${((currentQuizIndex + 1) / mutashabihat.length) * 100}%` }} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((opt) => {
            const isCorrect = opt === currentQuestion.correct;
            const isSelected = quizFeedback !== null;
            const feedbackStyle = quizFeedback === 'correct' && isCorrect 
              ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-xl shadow-emerald-400/20' 
              : quizFeedback === 'wrong' && isCorrect 
                ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400'
                : quizFeedback === 'wrong' && !isCorrect
                  ? 'bg-red-400/10 text-red-400 border-red-400/20 opacity-50'
                  : 'bg-white/[0.03] border-white/[0.05] hover:border-white/[0.1] text-slate-300';

            return (
              <button 
                key={opt} 
                disabled={isSelected}
                onClick={() => handleQuizAnswer(opt)} 
                className={`p-6 rounded-[1.5rem] border text-lg font-bold transition-all flex items-center justify-between group ${feedbackStyle}`}
              >
                {opt}
                {isSelected && isCorrect && <CheckCircle2 size={20} />}
                {isSelected && !isCorrect && quizFeedback === 'wrong' && <XCircle size={20} />}
              </button>
            );
          })}
        </div>
        
        {quizFeedback && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center p-6 rounded-3xl bg-amber-400/5 border border-amber-400/10">
            <p className="text-amber-400/80 text-sm font-medium italic">{currentQuestion.explanation}</p>
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (subView === 'quiz-result') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center space-y-12 pt-20">
        <div className="space-y-6">
          <div className="w-32 h-32 rounded-[3rem] bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center mx-auto shadow-2xl shadow-amber-400/20">
            <CheckCircle2 size={64} className="text-slate-950" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white">Quiz Complete!</h2>
            <p className="text-slate-500 font-medium">Excellent progress in Mutashabihat.</p>
          </div>
        </div>

        <div className="glass-card p-10 space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Your Score</span>
            <div className="text-6xl font-black text-white">{quizScore} <span className="text-2xl text-slate-700">/ {mutashabihat.length}</span></div>
          </div>
          
          <div className="flex gap-4">
            <button onClick={startQuiz} className="flex-1 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all">
              <RotateCcw size={16} />
              Retry
            </button>
            <button onClick={() => setPartnerSubView('menu')} className="flex-1 py-5 bg-white/[0.05] border border-white/[0.05] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/[0.1] transition-all">
              Main Menu
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default QuizEngine;
