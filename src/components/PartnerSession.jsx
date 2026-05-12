import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Settings, Play, CheckCircle2, AlertCircle } from 'lucide-react';

const PartnerSession = ({
  subView,
  selectedSurah,
  musaffaStart,
  setMusaffaStart,
  musaffaEnd,
  setMusaffaEnd,
  whoStarts,
  setWhoStarts,
  chunkSize,
  setChunkSize,
  startMusaffa,
  chunks,
  currentChunkIndex,
  mudarasaTurn,
  currentAyahNumber,
  handleNextTurnManual,
  logStumble,
  setPartnerSubView,
}) => {
  if (subView === 'config') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto space-y-10 pt-8 pb-24">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-400/10 rounded-3xl flex items-center justify-center mx-auto border border-amber-400/20 shadow-2xl shadow-amber-400/10">
            <Settings className="text-amber-400" size={32} strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-white">Musaffa Setup</h2>
            <p className="text-slate-500 font-medium">{selectedSurah.englishName} ({selectedSurah.name})</p>
          </div>
        </div>

        <div className="glass-card p-10 space-y-10 border-white/[0.05]">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-amber-400 rounded-full" />
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recitation Strategy</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setWhoStarts('app')} 
                className={`py-5 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-widest transition-all ${whoStarts === 'app' ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xl shadow-amber-400/20' : 'bg-white/[0.03] border-white/[0.05] text-slate-500 hover:border-white/[0.1]'}`}
              >
                App Starts
              </button>
              <button 
                onClick={() => setWhoStarts('user')} 
                className={`py-5 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-widest transition-all ${whoStarts === 'user' ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-xl shadow-emerald-400/20' : 'bg-white/[0.03] border-white/[0.05] text-slate-500 hover:border-white/[0.1]'}`}
              >
                I Start
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-amber-400 rounded-full" />
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ayah Range</label>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <span className="text-[9px] font-bold text-slate-600 block px-2">FROM</span>
                <input type="number" value={musaffaStart} onChange={(e) => setMusaffaStart(Number(e.target.value))} className="w-full bg-slate-900/50 border border-white/[0.05] p-5 rounded-2xl text-center font-bold text-white focus:border-amber-400/30 outline-none transition-all" />
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-[9px] font-bold text-slate-600 block px-2">TO</span>
                <input type="number" value={musaffaEnd} onChange={(e) => setMusaffaEnd(Number(e.target.value))} className="w-full bg-slate-900/50 border border-white/[0.05] p-5 rounded-2xl text-center font-bold text-white focus:border-amber-400/30 outline-none transition-all" />
              </div>
            </div>
          </div>

          <button 
            onClick={startMusaffa} 
            className="w-full py-6 bg-amber-400 text-slate-950 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-400/30 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Play size={18} fill="currentColor" />
            Launch Session
          </button>
        </div>
      </motion.div>
    );
  }

  if (subView === 'mudarasa' && chunks[currentChunkIndex]) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 text-center pt-4 max-w-3xl mx-auto pb-40">
        <div className="flex items-center justify-between sticky top-4 py-4 bg-slate-900/80 backdrop-blur-xl z-[100] px-6 rounded-[2rem] border border-white/[0.05] shadow-2xl">
          <button onClick={() => setPartnerSubView('config')} className="p-3 bg-white/[0.05] rounded-2xl hover:bg-white/[0.1] transition-all"><ChevronLeft size={20} /></button>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${mudarasaTurn === 'app' ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                {mudarasaTurn === 'app' ? "Musaffa Reciting" : "Your Turn"}
              </span>
            </div>
            <div className="w-32 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div className="h-full bg-amber-400" animate={{ width: `${((currentChunkIndex + 1) / chunks.length) * 100}%` }} />
            </div>
          </div>

          <div className="text-[10px] font-black text-slate-500 bg-white/[0.05] px-4 py-2 rounded-xl">
            {currentChunkIndex + 1} / {chunks.length}
          </div>
        </div>

        <div className={`p-10 md:p-20 rounded-[3rem] transition-all duration-700 min-h-[550px] flex flex-col justify-center relative overflow-hidden ${mudarasaTurn === 'app' ? 'bg-amber-400/[0.01] border border-amber-400/5' : 'bg-emerald-400/[0.01] border border-emerald-400/5'}`}>
          <div className="space-y-16 relative z-10">
            <div className="arabic-text text-4xl md:text-6xl leading-[2] text-center dir-rtl">
              {chunks[currentChunkIndex].map((ayah) => (
                <span 
                  key={ayah.number} 
                  className={`inline transition-all duration-500 ${currentAyahNumber === ayah.number ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]' : mudarasaTurn === 'app' ? 'opacity-20 blur-[1px]' : 'opacity-100 text-white/90'}`}
                >
                  {ayah.text} 
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-current text-[12px] mx-4 align-middle opacity-10">{ayah.numberInSurah}</span>
                </span>
              ))}
            </div>

            {mudarasaTurn === 'user' && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 pt-10">
                  <button 
                    onClick={handleNextTurnManual} 
                    className="group relative w-full max-w-sm py-12 bg-white text-slate-950 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-2xl shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center gap-4"
                  >
                    <CheckCircle2 size={32} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                    Finish Reading
                  </button>
                  
                  <button 
                    onClick={() => logStumble(chunks[currentChunkIndex][0])} 
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-400/5 text-red-400/40 hover:bg-red-400/10 hover:text-red-400 transition-all text-[10px] font-black uppercase tracking-widest border border-red-400/10"
                  >
                    <AlertCircle size={14} />
                    Log Stumble
                  </button>
              </motion.div>
            )}
          </div>
          
          {/* Subtle background glow */}
          <div className={`absolute inset-0 opacity-20 blur-[100px] pointer-events-none transition-all duration-1000 ${mudarasaTurn === 'app' ? 'bg-amber-400/10' : 'bg-emerald-400/10'}`} />
        </div>
      </motion.div>
    );
  }

  return null;
};

export default PartnerSession;
