import { motion } from 'framer-motion';
import { BookOpen, Volume2, Mail, Link, ChevronLeft, ChevronRight, Database } from 'lucide-react';

const pill = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
  padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s',
  minHeight: '52px', fontSize: 'var(--fs-secondary)', fontWeight: '600',
};

const linkPill = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s',
  minHeight: '52px', fontSize: 'var(--fs-secondary)', fontWeight: '600',
  textDecoration: 'none',
};

export default function SettingsPage({ setView }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pb-24"
      style={{ maxWidth: '28rem', margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 'var(--z-header)',
        width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0,
        backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: 'var(--border-hairline)',
      }}>
        <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={() => setView('list')}
                aria-label="Back"
                title="Back to home"
                className="icon-btn"
              >
                <ChevronLeft size={18} />
              </button>
              <BookOpen size={18} color="var(--accent-gold)" strokeWidth={2} />
              <h2 style={{
                fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)',
                margin: 0, letterSpacing: '-0.01em',
              }}>
                Settings
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 'var(--space-5) var(--space-4) 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* Recitation Map — opens its original full page, returns to Settings */}
          <button
            onClick={() => setView('recitation-map')}
            style={pill}
            title="Recitation Map"
          >
            <BookOpen size={15} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Recitation Map</span>
            <ChevronRight size={14} color="var(--text-muted)" />
          </button>

          {/* Audio Manager — opens its original full page, returns to Settings */}
          <button
            onClick={() => setView('audio-manager')}
            style={pill}
            title="Audio Manager"
          >
            <Volume2 size={15} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Audio Manager</span>
            <ChevronRight size={14} color="var(--text-muted)" />
          </button>

          {/* Email */}
          <a
            href="mailto:ahmadmusamuhd@gmail.com"
            style={linkPill}
            title="Send an Email"
          >
            <Mail size={15} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Email</span>
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/ahmad-m-musa-b93587156/"
            target="_blank"
            rel="noopener noreferrer"
            style={linkPill}
            title="Send a DM"
          >
            <Link size={15} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>LinkedIn</span>
          </a>
        </div>
      </div>

      {/* Data Sources */}
      <div style={{
        padding: 'var(--space-5) 1.25rem 0',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 'var(--space-2)',
        }}>
          <Database size={12} color="var(--accent-gold)" />
          <span style={{
            fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-strong)',
            textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
            color: 'var(--text-muted)',
          }}>
            Data Sources
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
  );
}
