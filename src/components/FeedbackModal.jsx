import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Link, Database, Download, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function FeedbackModal({ onClose, modelStatus, installProgress, installMessage, confirmInstall, isNative }) {
  return (
    <AnimatePresence>
      <motion.div
        key="feedback-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          style={{
            width: '100%', maxWidth: '26rem',
            borderRadius: '2rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            borderTop: '3px solid var(--accent-gold)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px var(--accent-gold-soft)',
            padding: '1.75rem',
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h2 id="feedback-title" style={{
                fontSize: '1.15rem', fontWeight: '900', letterSpacing: '-0.02em',
                color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
              }}>
                Feedback & Suggestions
              </h2>
              <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                We'd love to hear from you
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: '2.25rem', height: '2.25rem', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '999px',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Contact Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Email Card */}
            <a
              href="mailto:ahmadmusamuhd@gmail.com"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                background: 'var(--accent-gold-soft)',
                border: '1px solid rgba(251,191,36,0.2)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '2.75rem', height: '2.75rem', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0.875rem',
                background: 'linear-gradient(135deg, var(--accent-gold), #2563eb)',
                color: '#fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 16px rgba(0,0,0,0.15)',
              }}>
                <Mail size={18} />
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: '900',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                }}>
                  Email
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Send an Email
                </span>
              </div>
            </a>

            {/* LinkedIn Card */}
            <a
              href="https://www.linkedin.com/in/ahmad-m-musa-b93587156/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                background: 'var(--accent-gold-soft)',
                border: '1px solid rgba(251,191,36,0.2)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '2.75rem', height: '2.75rem', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0.875rem',
                background: 'linear-gradient(135deg, var(--accent-gold), #0284c7)',
                color: '#fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 16px rgba(0,0,0,0.15)',
              }}>
                <Link size={18} />
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: '900',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                }}>
                  LinkedIn
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Send a DM
                </span>
              </div>
            </a>
          </div>

          {/* SDK Download Section */}
          {isNative && modelStatus !== 'idle' && (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Download size={12} color="var(--accent-gold)" />
                <span style={{
                  fontSize: '0.6rem', fontWeight: '900',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                }}>
                  Speech Recognition SDK
                </span>
              </div>

              {modelStatus === 'needs_install' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    The offline speech recognition model is bundled in the app and will be installed on first use (~40MB).
                  </p>
                  <button
                    onClick={() => confirmInstall()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, var(--accent-gold), #2563eb)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <Download size={16} />
                    Install Speech SDK
                  </button>
                </div>
              )}

              {modelStatus === 'installing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader size={16} className="animate-spin" style={{ color: 'var(--accent-gold)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {installMessage || 'Installing...'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '99px',
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                    <motion.div
                      animate={{ width: `${installProgress}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                      style={{
                        height: '100%',
                        borderRadius: '99px',
                        background: 'linear-gradient(90deg, var(--accent-gold), #2563eb)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {installProgress}%
                  </span>
                </div>
              )}

              {modelStatus === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {installMessage || 'Installation failed'}
                    </span>
                  </div>
                  <button
                    onClick={() => confirmInstall()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Download size={14} />
                    Retry Install
                  </button>
                </div>
              )}

              {modelStatus === 'ready' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Speech recognition SDK is ready
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Data Sources */}
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Database size={12} color="var(--accent-gold)" />
              <span style={{
                fontSize: '0.6rem', fontWeight: '900',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'var(--text-muted)',
              }}>
                Data Sources
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {[
                { href: 'https://api.alquran.cloud/v1/quran/quran-uthmani-quran-academy', label: 'quran-ar.json', desc: 'Al Quran Cloud (Uthmani)' },
                { href: 'https://api.alquran.cloud/v1/quran/en.sahih', label: 'quran-en.json', desc: 'Saheeh International' },
                { href: 'https://tanzil.net', label: 'quran-simple.txt', desc: 'Tanzil Project' },
                { href: 'https://github.com/Waqar144/Quran_Mutashabihat_Data', label: 'waqar114', desc: 'Mutashabihat Dataset' },
              ].map((src) => (
                <a
                  key={src.label}
                  href={src.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.7rem', textDecoration: 'none',
                    color: 'var(--text-secondary)',
                    transition: 'color 0.2s',
                  }}
                >
                  <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>{src.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                  <span>{src.desc}</span>
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
