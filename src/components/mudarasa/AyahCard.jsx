import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { removeTashkeel, normalizeArabic, expandMuqattaat, BISMILLAH_SIMPLE } from '../../utils/quranUtils';

const WORD_COLORS = {
  correct: { color: 'rgba(16,185,129,0.9)', bg: 'rgba(16,185,129,0.15)' },
  substitution: { color: 'rgba(245,158,11,0.95)', bg: 'rgba(245,158,11,0.2)' },
  omission: { color: 'rgba(239,68,68,0.95)', bg: 'rgba(239,68,68,0.15)' },
  pending: { color: 'rgba(255,255,255,0.3)', bg: 'transparent' },
};

export const LiveTextOverlay = ({ plainText, results, numberInSurah, wordOffset = 0 }) => {
  if (!plainText) return null;

  const originalWords = plainText.trim().split(/\s+/).filter(Boolean);
  const wordMapping = [];
  let currentIndex = 0;
  
  for (const origWord of originalWords) {
    const clean = removeTashkeel(origWord);
    const exp = normalizeArabic(expandMuqattaat(clean));
    const count = exp.trim().split(/\s+/).filter(Boolean).length;
    
    wordMapping.push({
      word: origWord,
      startIdx: currentIndex,
      count: count
    });
    currentIndex += count;
  }

  const getWordStatus = (mapping) => {
    let hasPending = false;
    let hasError = false;
    let hasCorrect = false;
    let spokenWord = null;

    for (let i = 0; i < mapping.count; i++) {
      const globalIdx = mapping.startIdx + i + wordOffset;
      const status = results && globalIdx < results.length ? results[globalIdx]?.status : 'pending';
      const spk = results && globalIdx < results.length ? results[globalIdx]?.spokenWord : null;
      if (spk) spokenWord = spk;

      if (status === 'pending') hasPending = true;
      else if (status === 'correct') hasCorrect = true;
      else hasError = true;
    }

    if (hasPending && !hasError && !hasCorrect) return { status: 'pending', spokenWord: null };
    if (hasError) return { status: 'omission', spokenWord }; 
    if (hasPending && hasCorrect) return { status: 'pending', spokenWord: null };
    return { status: 'correct', spokenWord };
  };

  return (
    <p
      className="arabic-text"
      style={{
        fontSize: '2.2rem',
        lineHeight: '2.4',
        direction: 'rtl',
        textAlign: 'right',
        wordSpacing: '0.15rem',
        margin: 0,
      }}
    >
      {wordMapping.map((mapping, idx) => {
        const { status, spokenWord } = getWordStatus(mapping);
        const cfg = WORD_COLORS[status] || WORD_COLORS.pending;

        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              marginLeft: '0.3rem',
              color: cfg.color,
              background: cfg.bg,
              borderRadius: '4px',
              fontWeight: status === 'correct' ? '400' : '700',
              textDecoration: status === 'omission' ? 'underline wavy #ef4444' : 'none',
              textShadow: status !== 'pending' ? `0 0 8px ${cfg.color}` : 'none',
              transition: 'all 0.2s',
            }}
            title={spokenWord ? `You said: ${spokenWord}` : undefined}
          >
            {mapping.word}
          </span>
        );
      })}
      {numberInSurah && (
        <span style={{
          fontSize: '1.2rem',
          color: 'var(--accent-gold)',
          opacity: 0.5,
          marginRight: '0.5rem',
          transition: 'opacity 0.2s'
        }}>
          ﴿{numberInSurah}﴾
        </span>
      )}
    </p>
  );
};

export const AyahCard = ({
  ayah,
  currentAyahNumber,
  isActive,
  isCompleted,
  isLocked,
  showText,
  isFirstAyahOfSurah,
  showLiveOverlay,
  showCompletedOverlay,
  displayText,
  results,
  wordOffset
}) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem',
        opacity: isLocked ? 0.2 : (isCompleted ? 0.8 : 1),
        pointerEvents: isLocked ? 'none' : 'auto',
        transition: 'all 0.4s ease',
      }}
    >
      {isFirstAyahOfSurah && showText && !isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: currentAyahNumber === `bismillah-${ayah.number}` ? 1.02 : 1 }}
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            borderRadius: '1.5rem',
            background: currentAyahNumber === `bismillah-${ayah.number}` ? 'var(--accent-gold-soft)' : 'transparent',
            border: currentAyahNumber === `bismillah-${ayah.number}` ? '1px solid var(--accent-gold-soft)' : '1px solid transparent',
            transition: '0.4s'
          }}
        >
          <p className="arabic-text" style={{ fontSize: '2.5rem', color: currentAyahNumber === `bismillah-${ayah.number}` ? 'var(--accent-gold)' : 'var(--text-primary)', opacity: currentAyahNumber === `bismillah-${ayah.number}` ? 1 : 0.8 }}>{BISMILLAH_SIMPLE}</p>
        </motion.div>
      )}
      <motion.div
        id={`mudarasa-ayah-${ayah.number}`}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1, 
          scale: (ayah.number === currentAyahNumber || isActive) ? 1.01 : 1 
        }}
        style={{
          textAlign: 'right', 
          padding: '1.5rem', 
          borderRadius: '1.5rem',
          background: (ayah.number === currentAyahNumber || (isActive && !isLocked && !isCompleted)) ? 'var(--accent-gold-soft)' : 'transparent',
          border: (ayah.number === currentAyahNumber || (isActive && !isLocked && !isCompleted)) ? '1px solid var(--accent-gold-soft)' : '1px solid transparent',
          transition: '0.4s'
        }}
      >
        {showText ? (
          (showLiveOverlay || showCompletedOverlay) ? (
            <LiveTextOverlay
              plainText={displayText}
              results={results}
              numberInSurah={ayah.numberInSurah}
              wordOffset={wordOffset}
            />
          ) : (
            <p 
              className="arabic-text" 
              style={{ 
                fontSize: '2.2rem', 
                color: isCompleted ? 'var(--accent-emerald)' : ((ayah.number === currentAyahNumber || isActive) ? 'var(--accent-gold)' : 'var(--text-primary)') 
              }}
            >
              {displayText}{' '}
              <span style={{ fontSize: '1.2rem', color: isCompleted ? 'var(--accent-emerald)' : 'var(--accent-gold)', opacity: 0.5, marginRight: '0.5rem' }}>
                ﴿{ayah.numberInSurah}﴾
              </span>
              {isCompleted && (
                <CheckCircle2 size={16} style={{ display: 'inline-block', marginRight: '0.5rem', color: 'var(--accent-emerald)', verticalAlign: 'middle' }} />
              )}
            </p>
          )
        ) : (
          <p style={{ fontSize: '1rem', color: isCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)', opacity: isCompleted ? 0.8 : 0.4, textAlign: 'center', fontWeight: '700', letterSpacing: '0.1em' }}>
            {isCompleted ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                — {ayah.numberInSurah} — <CheckCircle2 size={12} />
              </span>
            ) : (
              `— ${ayah.numberInSurah} —`
            )}
          </p>
        )}
      </motion.div>
    </div>
  );
};
