import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, X, MessageCircleQuestion, Search, ArrowLeft } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

const Header = ({ view, theme, setTheme, setView, searchQuery, setSearchQuery, modelStatus, installProgress, installMessage, showInstallPrompt, confirmInstall, setShowInstallPrompt, isNative }) => {
  const isDark = theme === 'dark';
  const [settingsOpen, setSettingsOpen] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/settings');
  const [feedbackOpen, setFeedbackOpen] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/feedback');
  const searchOpen = view === 'search';
  const [previousPath, setPreviousPath] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const syncFromUrl = () => {
      setSettingsOpen(window.location.pathname === '/settings' || window.location.pathname === '/feedback');
      setFeedbackOpen(window.location.pathname === '/feedback');
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (feedbackOpen || settingsOpen) {
      const nextPath = feedbackOpen ? '/feedback' : '/settings';
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    }
  }, [settingsOpen, feedbackOpen]);

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
          <div className="flex items-center gap-2 py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <button onClick={closeSearch} className="icon-btn" title="Back" aria-label="Back">
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <div className="search-input-wrapper" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search surah, ayah or word..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ paddingLeft: '2.5rem', paddingRight: searchQuery ? '2.5rem' : '1rem' }}
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
            {!settingsOpen && (
              <>
                <button onClick={openSearch} className="icon-btn" title="Search" aria-label="Search">
                  <Search size={16} strokeWidth={2} />
                </button>
                <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="icon-btn" title="Toggle Theme">
                  {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
                </button>
              </>
            )}

            <button onClick={() => {
              if (window.location.pathname !== '/settings' && window.location.pathname !== '/feedback' && window.location.pathname !== '/search') {
                setPreviousPath(window.location.pathname);
              }
              setFeedbackOpen((open) => !open);
            }} className="icon-btn" title="Feedback">
              <MessageCircleQuestion size={16} strokeWidth={2} />
            </button>

            {settingsOpen && (
              <button onClick={() => { setSettingsOpen(false); setFeedbackOpen(false); setPreviousPath(''); }} className="icon-btn" title="Close Settings">
                <X size={16} strokeWidth={2} />
              </button>
            )}

            {feedbackOpen && (
              <FeedbackModal onClose={() => { setFeedbackOpen(false); setPreviousPath(''); }} modelStatus={modelStatus} installProgress={installProgress} installMessage={installMessage} showInstallPrompt={showInstallPrompt} confirmInstall={confirmInstall} setShowInstallPrompt={setShowInstallPrompt} isNative={isNative} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
