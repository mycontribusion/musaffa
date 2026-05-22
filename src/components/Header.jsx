import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, PlayCircle } from 'lucide-react';

const Header = ({ theme, setTheme }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const isPartner = location.pathname.startsWith('/partner');

  return (
    <header className="flex items-center justify-between py-4 mb-6 sticky top-0 z-100" style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--glass-border)', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/pwa-192x192.png" alt="MusaffaPro Icon" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
        <h1 style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          MusaffaPro
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={() => navigate('/partner')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: isPartner ? 'var(--accent-gold)' : 'var(--glass-bg)',
            color: isPartner ? '#000' : 'var(--text-primary)',
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
