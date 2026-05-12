import React from 'react';
import { Book, Moon, Sun, Users, Settings } from 'lucide-react';

const Header = ({ theme, setTheme, view, setView }) => {
  const isDark = theme === 'dark';
  
  return (
    <header className="flex items-center justify-between py-6 mb-8 sticky top-0 z-100" style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--glass-border)', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('list')}>
        <Book className="text-accent-gold" size={24} strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
          Musaffa <span style={{ color: 'var(--accent-gold)', fontWeight: '500', opacity: 0.8 }}>Partner</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="icon-btn" title="Community">
          <Users size={18} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setTheme(isDark ? 'light' : 'dark')} 
          className="icon-btn"
          title="Toggle Theme"
        >
          {isDark ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
        </button>
        <button 
          onClick={() => setView('partner')} 
          className="icon-btn"
          style={view === 'partner' ? { backgroundColor: 'var(--accent-gold)', color: '#000' } : {}}
          title="Partner Mode"
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};

export default Header;
