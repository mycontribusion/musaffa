import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Mic } from 'lucide-react';

const MudarasaView = ({
  chunks,
  currentChunkIndex,
  currentAyahNumber,
  mudarasaTurn,
  onNext,
  onBack,
  onLogStumble,
  isListening,
  activeAyahRef
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      {/* Dynamic Header */}
      <div style={{ position: 'sticky', top: '70px', zIndex: 90, padding: '1rem 0' }}>
        <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={onBack} className="icon-btn" style={{ width: '32px', height: '32px' }}><ChevronLeft size={16} /></button>
            <div>
              <span style={{ fontSize: '0.55rem', fontWeight: '900', color: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {mudarasaTurn === 'app' ? 'Listening to Partner' : 'Your Turn to Recite'}
              </span>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Portion {currentChunkIndex + 1} of {chunks.length}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mudarasaTurn === 'app' ? 'var(--accent-gold)' : 'var(--bg-accent)', boxShadow: mudarasaTurn === 'app' ? '0 0 10px var(--accent-gold)' : 'none' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: mudarasaTurn === 'user' ? 'var(--accent-emerald)' : 'var(--bg-accent)', boxShadow: mudarasaTurn === 'user' ? '0 0 10px var(--accent-emerald)' : 'none' }} />
          </div>
        </div>
      </div>

      {/* Recitation Content */}
      <div style={{ flex: 1, padding: '2rem 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {chunks[currentChunkIndex].map((ayah) => {
            let displayText = ayah.text;
            if (ayah.numberInSurah === 1 && ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
              const bismillahRegex = /^(\ufeff)?\s*ب[\u064b-\u065f]*سْمِ.*?ٱلرَّحِيمِ\s*/;
              displayText = displayText.replace(bismillahRegex, "").trim();
            }

            return (
              <motion.div 
                key={ayah.number} 
                ref={ayah.number === currentAyahNumber ? activeAyahRef : null}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: ayah.number === currentAyahNumber || mudarasaTurn === 'user' ? 1 : 0.3, scale: ayah.number === currentAyahNumber ? 1.02 : 1 }}
                style={{ textAlign: 'right', padding: '1.5rem', borderRadius: '1.5rem', background: ayah.number === currentAyahNumber ? 'var(--accent-gold-soft)' : 'transparent', border: ayah.number === currentAyahNumber ? '1px solid var(--accent-gold-soft)' : '1px solid transparent', transition: '0.4s' }}
              >
                <p className="arabic-text" style={{ fontSize: '2.2rem', color: ayah.number === currentAyahNumber ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                  {displayText} <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', opacity: 0.5, marginRight: '0.5rem' }}>﴿{ayah.numberInSurah}﴾</span>
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ position: 'fixed', bottom: '2rem', left: '0', right: '0', zIndex: 100, display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {mudarasaTurn === 'user' && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={onNext}
                className="btn-primary"
                style={{ background: 'var(--accent-emerald)', padding: '1.25rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff', fontSize: '0.8rem', letterSpacing: '0.1em' }}
              >
                <span>Finished Portion</span>
              </button>
              <button onClick={() => onLogStumble(chunks[currentChunkIndex][0])} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', opacity: 0.5, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Log Stumble</button>
              
              {isListening && (
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                  <Mic size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  HANDS-FREE ACTIVE: TURN WILL SWITCH AUTOMATICALLY AFTER SILENCE
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MudarasaView;
