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
          position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-5)',
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
            borderRadius: 'var(--radius-xl)',
            background: 'var(--bg-secondary)',
            border: 'var(--border-hairline)',
            borderTop: '3px solid var(--accent-gold)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px var(--accent-gold-soft)',
            padding: '1.75rem',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <div>
              <h2 id="feedback-title" style={{
                fontSize: '1.15rem', fontWeight: 'var(--fw-strong)', letterSpacing: 'var(--tracking-tight)',
                color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
              }}>
                Feedback & Suggestions
              </h2>
              <p style={{ marginTop: '0.3rem', fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', fontWeight: '500' }}>
                We'd love to hear from you
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: '2.25rem', height: '2.25rem', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-full)',
                border: 'var(--border-hairline)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Email Card */}
            <a
              href="mailto:ahmadmusamuhd@gmail.com"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                padding: 'var(--space-4)',
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
                  fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-strong)',
                  letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                }}>
                  Email
                </span>
                <span style={{ fontSize: 'var(--fs-body)', fontWeight: '700', color: 'var(--text-primary)' }}>
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
                padding: 'var(--space-4)',
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
                  fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-strong)',
                  letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                }}>
                  LinkedIn
                </span>
                <span style={{ fontSize: 'var(--fs-body)', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Send a DM
                </span>
              </div>
            </a>
          </div>

          {/* SDK Download Section */}
          {isNative && modelStatus !== 'idle' && (
            <div style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--glass-bg)',
              border: 'var(--border-hairline)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Download size={12} color="var(--accent-gold)" />
                <span style={{
                  fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-strong)',
                  textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
                  color: 'var(--text-muted)',
                }}>
                  Speech Recognition SDK
                </span>
              </div>

              {modelStatus === 'needs_install' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--fs-secondary)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    The offline speech recognition model is bundled in the app and will be installed on first use (~40MB).
                  </p>
                  <button
                    onClick={() => confirmInstall()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, var(--accent-gold), #2563eb)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 'var(--fs-body-sm)',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Loader size={16} className="animate-spin" style={{ color: 'var(--accent-gold)' }} />
                    <span style={{ fontSize: 'var(--fs-secondary)', color: 'var(--text-secondary)' }}>
                      {installMessage || 'Installing...'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                    <motion.div
                      animate={{ width: `${installProgress}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                      style={{
                        height: '100%',
                        borderRadius: 'var(--radius-full)',
                        background: 'linear-gradient(90deg, var(--accent-gold), #2563eb)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {installProgress}%
                  </span>
                </div>
              )}

              {modelStatus === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <AlertCircle size={16} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: 'var(--fs-secondary)', color: 'var(--text-secondary)' }}>
                      {installMessage || 'Installation failed'}
                    </span>
                  </div>
                  <button
                    onClick={() => confirmInstall()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                      padding: '0.6rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-primary)',
                      border: 'var(--border-hairline)',
                      fontSize: 'var(--fs-secondary)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle size={16} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: 'var(--fs-secondary)', color: 'var(--text-secondary)' }}>
                    Speech recognition SDK is ready
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Data Sources */}
          <div style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--glass-bg)',
            border: 'var(--border-hairline)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Database size={12} color="var(--accent-gold)" />
              <span style={{
                fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-strong)',
                textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
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
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    fontSize: 'var(--fs-meta)', textDecoration: 'none',
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
