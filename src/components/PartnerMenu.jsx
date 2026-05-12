import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, BrainCircuit, ChevronRight } from 'lucide-react';

const PartnerMenu = ({ setView, startQuiz }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', paddingTop: '2rem', textAlign: 'center' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>Partner Mode</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto' }}>Enhance your memorization with interactive tools designed for Hifz and Mudarasa.</p>
      </div>

      <div className="grid md:grid-cols-2" style={{ gap: '2rem' }}>
        <motion.button 
          whileHover={{ y: -8 }}
          onClick={() => setView('list')} 
          className="glass-card"
          style={{ padding: '3rem', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(251, 191, 36, 0.1)', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
              <BookOpen size={32} strokeWidth={1.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-primary)' }}>Start Musaffa</h3>
              <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Interactive turn-taking recitation session with the app.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>
              Go to Library <ChevronRight size={14} />
            </div>
          </div>
          <Users size={120} strokeWidth={1} style={{ position: 'absolute', top: '0', right: '0', padding: '2rem', opacity: 0.05 }} />
        </motion.button>

        <motion.button 
          whileHover={{ y: -8 }}
          onClick={startQuiz} 
          className="glass-card"
          style={{ padding: '3rem', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(16, 185, 129, 0.1)', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <BrainCircuit size={32} strokeWidth={1.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-primary)' }}>Mutashabihat Quiz</h3>
              <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Test your knowledge of similar verses across different Surahs.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>
              Start Test <ChevronRight size={14} />
            </div>
          </div>
          <BrainCircuit size={120} strokeWidth={1} style={{ position: 'absolute', top: '0', right: '0', padding: '2rem', opacity: 0.05 }} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PartnerMenu;
