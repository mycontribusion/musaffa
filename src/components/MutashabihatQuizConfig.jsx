import { motion } from 'framer-motion';
import { BrainCircuit, ChevronLeft, Target, Shuffle, List } from 'lucide-react';

const MutashabihatQuizConfig = ({
  surah,
  quizType,
  onQuizTypeChange,
  onStartQuiz,
  onBack,
  hasMutashabihat
}) => {
  const QUIZ_TYPES = [
    { id: 'all', label: 'All Types', icon: <Shuffle size={14} />, description: 'Mixed questions from all categories' },
    { id: 'beginnings', label: 'Verse Openings', icon: <List size={14} />, description: 'Identify verses from their opening words' },
    { id: 'endings', label: 'Verse Finales', icon: <List size={14} />, description: 'Identify verses from their closing words' },
    { id: 'one-word', label: 'Subtle Distinctions', icon: <Target size={14} />, description: 'Spot the single-word difference' },
    { id: 'continue', label: 'Continuations', icon: <ChevronLeft size={14} />, description: 'Which verse follows the context?' },
    { id: 'which-surah', label: 'Surah Identification', icon: <BrainCircuit size={14} />, description: 'Identify the correct Surah' },
  ];

  const sectionLabel = {
    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '640px', margin: '0 auto', padding: '0.5rem 0.5rem 6rem' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: '10px',
              border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
            Mutashabihat Quiz
          </h2>
        </div>

        {/* Surah Info */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Practicing: <strong style={{ color: 'var(--text-primary)' }}>{surah?.englishName}</strong>
          </p>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
            {hasMutashabihat ? 'Ready to begin' : 'No mutashabihat data available'}
          </p>
        </div>

        {/* Quiz Type Selection */}
        <div>
          <div style={sectionLabel}>Quiz Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {QUIZ_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => onQuizTypeChange(type.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.9rem 1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  background: quizType === type.id ? 'var(--accent-gold-soft)' : 'var(--bg-accent)',
                  border: '1px solid',
                  borderColor: quizType === type.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: quizType === type.id ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                    color: quizType === type.id ? '#000' : 'var(--text-muted)'
                  }}>
                    {type.icon}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: '800', fontSize: '0.8rem', color: quizType === type.id ? 'var(--accent-gold)' : 'var(--text-primary)', margin: 0 }}>
                      {type.label}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {type.description}
                    </p>
                  </div>
                </div>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: '2px solid',
                  borderColor: quizType === type.id ? 'var(--accent-gold)' : 'var(--glass-border)',
                  background: quizType === type.id ? 'var(--accent-gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {quizType === type.id && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000' }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStartQuiz}
          disabled={!hasMutashabihat}
          className="btn-primary"
          style={{
            width: '100%', padding: '1.1rem', fontSize: '0.9rem',
            opacity: hasMutashabihat ? 1 : 0.3, cursor: hasMutashabihat ? 'pointer' : 'not-allowed'
          }}
        >
          Start Quiz
        </button>
      </div>
    </motion.div>
  );
};

export default MutashabihatQuizConfig;