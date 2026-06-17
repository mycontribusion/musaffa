import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, PlayCircle, Pause, User, BookOpen, Settings, X, MessageCircleQuestion } from 'lucide-react';
import { RECITERS } from '../utils/quranUtils';

const Header = ({ theme, setTheme, view, setView, setPartnerSubView, isInMusaffaSession, isPaused, onPauseMusaffa, onResumeMusaffa, reciter, setReciter }) => {
  const isDark = theme === 'dark';
  const [showReciterDropdown, setShowReciterDropdown] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/settings');
  const [feedbackOpen, setFeedbackOpen] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/feedback');
  const [previousPath, setPreviousPath] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowReciterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      setSettingsOpen(window.location.pathname === '/settings' || window.location.pathname === '/feedback');
      setFeedbackOpen(window.location.pathname === '/feedback');
    };

    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    const nextPath = feedbackOpen ? '/feedback' : settingsOpen ? '/settings' : previousPath || '/';

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [settingsOpen, feedbackOpen, previousPath]);

  return (
    <header
      className="sticky top-0 z-100 mb-6"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--glass-border)'
      }}
    >
      <div className="app-container">
        <div
          className="flex items-center justify-between py-4"
          style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}
        >
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('list'); }}>
            <img src="/pwa-192x192.png" alt="MusaffaPro Icon" style={{ width: '15px', height: '15px', borderRadius: '6px' }} />
            <h1 style={{ fontSize: 'clamp(0.8rem, 4vw, 0.8rem)', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              MusaffaPro
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {isInMusaffaSession ? (
              isPaused ? (
                <button
                  onClick={onResumeMusaffa}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--accent-emerald)',
                    color: '#fff',
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
              ) : (
                <button
                  onClick={onPauseMusaffa}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--accent-red)',
                    color: '#fff',
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
                  <Pause size={14} />
                  <span>Musaffa</span>
                </button>
              )
            ) : (
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
            )}

            {settingsOpen ? (
              <div className="relative flex items-center gap-2 md:gap-4">
                <button
                  onClick={() => {
                    setShowReciterDropdown(false);
                    if (window.location.pathname !== '/settings' && window.location.pathname !== '/feedback') {
                      setPreviousPath(window.location.pathname);
                    }
                    setFeedbackOpen((open) => !open);
                  }}
                  className="icon-btn"
                  title="Feedback"
                >
                  <MessageCircleQuestion size={16} strokeWidth={2} />
                </button>

                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="icon-btn"
                  title="Toggle Theme"
                >
                  {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
                </button>

                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setFeedbackOpen(false);
                    setPreviousPath('');
                    setShowReciterDropdown(false);
                  }}
                  className="icon-btn"
                  title="Close Settings"
                >
                  <X size={16} strokeWidth={2} />
                </button>

                {feedbackOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.5rem)',
                    right: 0,
                    width: '240px',
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    zIndex: 100
                  }}>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Feedback
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <a
                        href="https://www.linkedin.com/in/ahmad-m-musa-b93587156/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent-gold)',
                          color: '#000',
                          fontSize: '0.85rem',
                          fontWeight: '900',
                          textDecoration: 'none',
                          transition: 'var(--transition-fast)'
                        }}
                        className="hover-scale"
                      >
                        LinkedIn
                      </a>
                      <a
                        href="mailto:ahmadmusamuhd@gmail.com"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--glass-bg)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--glass-border)',
                          fontSize: '0.85rem',
                          fontWeight: '900',
                          textDecoration: 'none',
                          transition: 'var(--transition-fast)'
                        }}
                        className="hover-scale"
                      >
                        Email
                      </a>
                    </div>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Source: <a href="https://tanzil.net/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: '800' }}>Tanzil.net</a>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setView('weaknesses')}
                  className="icon-btn"
                  title="Mistake Book (Weaknesses)"
                  style={{ position: 'relative' }}
                >
                  <BookOpen size={16} strokeWidth={2} />
                </button>

                {/* Reciter Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowReciterDropdown(!showReciterDropdown)}
                    className="icon-btn"
                    title="Select Reciter"
                    style={{ position: 'relative' }}
                  >
                    <User size={16} strokeWidth={2} />
                  </button>

                  {showReciterDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      zIndex: 100,
                      minWidth: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                        Select Reciter
                      </div>
                      {RECITERS.map(r => (
                        <button
                          key={r.id}
                          onClick={() => {
                            if (setReciter) setReciter(r.id);
                            setShowReciterDropdown(false);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: reciter === r.id ? 'var(--accent-gold)' : 'transparent',
                            color: reciter === r.id ? '#000' : 'var(--text-primary)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'var(--transition-fast)'
                          }}
                          className="hover:bg-opacity-20"
                        >
                          <span style={{ fontWeight: reciter === r.id ? 'bold' : 'normal' }}>{r.name}</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{r.style}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowReciterDropdown(false);
                    if (window.location.pathname !== '/settings' && window.location.pathname !== '/feedback') {
                      setPreviousPath(window.location.pathname);
                    }
                    setFeedbackOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="icon-btn"
                  title="Settings"
                >
                  <Settings size={16} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
