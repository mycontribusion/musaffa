import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, X, Settings, Search, ArrowLeft } from 'lucide-react';

const Header = ({ view, theme, setTheme, setView, searchQuery, setSearchQuery, modelStatus, installProgress, installMessage, showInstallPrompt, confirmInstall, setShowInstallPrompt, isNative }) => {
  const isDark = theme === 'dark';
  const searchOpen = view === 'search';
  const [previousPath, setPreviousPath] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const openSearch = () => {
    setView('search');
  };

  const closeSearch = () => {
    setSearchQuery('');
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setView('list');
    }
  };

  if (searchOpen) {
    return (
      <header className="sticky top-0 z-100 mb-6" style={{ backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: 'var(--border-hairline)' }}>
        <div className="app-container">
          <div className="flex items-center py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div className="search-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <button onClick={closeSearch} className="icon-btn" title="Back" aria-label="Back" style={{ position: 'absolute', left: '0.25rem', zIndex: 2 }}>
                <ArrowLeft size={18} strokeWidth={2} />
              </button>
              <input
                ref={inputRef}
                type="search"
                placeholder="Search surah, ayah or word..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ paddingLeft: '3rem', paddingRight: searchQuery ? '2.5rem' : '1rem' }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-full)',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-100 mb-6" style={{ backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: 'var(--border-hairline)' }}>
      <div className="app-container">
        <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
          <div className="brand-lockup" onClick={() => { setView('list'); }}>
            <img src="/pwa-192x192.png" alt="MusaffaPro Icon" style={{ width: '22px', height: '22px', borderRadius: '7px' }} />
            <h1 style={{ fontSize: 'var(--fs-card)', fontWeight: '800', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              MusaffaPro
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={openSearch} className="icon-btn" title="Search" aria-label="Search">
              <Search size={16} strokeWidth={2} />
            </button>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="icon-btn" title="Toggle Theme">
              {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
            </button>

            <button onClick={() => {
              if (window.location.pathname !== '/settings' && window.location.pathname !== '/search') {
                setPreviousPath(window.location.pathname);
              }
              setView('settings');
            }} className="icon-btn" title="Settings">
              <Settings size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
