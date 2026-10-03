import { useState, useEffect } from 'react';
import { Moon, Sun, X, MessageCircleQuestion } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

const Header = ({ theme, setTheme, setView, modelStatus, installProgress, installMessage, showInstallPrompt, confirmInstall, setShowInstallPrompt, isNative }) => {
  const isDark = theme === 'dark';
  const [settingsOpen, setSettingsOpen] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/settings');
  const [feedbackOpen, setFeedbackOpen] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/feedback');
  const [previousPath, setPreviousPath] = useState('');

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
          className="flex items-center justify-between py-2"
          style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}
        >
          {/* Brand — same wordmark, logo asset, weight/tracking and destination.
              `.brand-lockup` keeps the .icon-btn Theme/Feedback height (36px,
              42px from 640px up) and centres its contents; only the internal
              scale of logo + text is tuned, so the header row is untouched. */}
          <div className="brand-lockup" onClick={() => { setView('list'); }}>
            <img src="/pwa-192x192.png" alt="MusaffaPro Icon" style={{ width: '22px', height: '22px', borderRadius: '7px' }} />
            <h1 style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              MusaffaPro
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Mistake Book and Reciter now live on the homepage (HomeControls),
                directly below this header. */}
            {!settingsOpen && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="icon-btn"
                title="Toggle Theme"
              >
                {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
              </button>
            )}

            {/* Feedback — the single existing feedback entry point, shared by
                both header states. Modal is rendered below. */}
            <button
              onClick={() => {
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

            {settingsOpen && (
              <button
                onClick={() => {
                  setSettingsOpen(false);
                  setFeedbackOpen(false);
                  setPreviousPath('');
                }}
                className="icon-btn"
                title="Close Settings"
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}

            {feedbackOpen && (
              <FeedbackModal
                onClose={() => {
                  setFeedbackOpen(false);
                  setPreviousPath('');
                }}
                modelStatus={modelStatus}
                installProgress={installProgress}
                installMessage={installMessage}
                showInstallPrompt={showInstallPrompt}
                confirmInstall={confirmInstall}
                setShowInstallPrompt={setShowInstallPrompt}
                isNative={isNative}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
