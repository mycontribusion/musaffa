import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, PlayCircle, Pause, User } from 'lucide-react';
import { RECITERS } from '../utils/quranUtils';

const Header = ({ theme, setTheme, view, setView, setPartnerSubView, isInMusaffaSession, isPaused, onPauseMusaffa, onResumeMusaffa, reciter, setReciter }) => {
  const isDark = theme === 'dark';
  const [showReciterDropdown, setShowReciterDropdown] = useState(false);
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
                  <span>Resume Musaffa</span>
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
                  <span>Pause Musaffa</span>
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
                <span>Start Musaffa</span>
              </button>
            )}

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
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="icon-btn"
              title="Toggle Theme"
            >
              {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
