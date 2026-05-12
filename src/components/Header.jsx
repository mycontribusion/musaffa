import React from 'react';
import { Book, Moon, Sun, PlayCircle } from 'lucide-react';

const Header = ({ theme, setTheme, view, setView, setPartnerSubView }) => {
  const isDark = theme === 'dark';
  
  return (
    <header className="flex items-center justify-between py-4 mb-6 sticky top-0 z-100" style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--glass-border)', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('list'); setPartnerSubView('menu'); }}>
        <Book className="text-accent-gold" size={20} strokeWidth={2} style={{ color: 'var(--accent-gold)' }} />
        <h1 style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          Musaffa <span style={{ color: 'var(--accent-gold)', fontWeight: '500', opacity: 0.8 }}>Partner</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => { setView('partner'); setPartnerSubView('config'); }} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            background: view === 'partner' ? 'var(--accent-gold)' : 'var(--glass-bg)',
            color: view === 'partner' ? '#000' : 'var(--text-primary)',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            fontSize: '0.65rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'var(--transition-fast)'
          }}
        >
          <PlayCircle size={14} />
          <span>Musaffa</span>
        </button>

        <button 
          onClick={() => setTheme(isDark ? 'light' : 'dark')} 
          className="icon-btn"
          title="Toggle Theme"
        >
          {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
