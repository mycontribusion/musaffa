import { motion } from 'framer-motion';
import { useState } from 'react';
import { BookOpen, Volume2, Mail, Link, ChevronLeft, ChevronRight, Database, ChevronDown } from 'lucide-react';

const pill = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
  padding: '1rem 1.25rem', borderRadius: 'var(--radius-xl)',
  background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)',
  color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease',
  minHeight: '56px', fontSize: 'var(--fs-body)', fontWeight: '700',
};

const linkPill = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
  padding: '1rem 1.25rem', borderRadius: 'var(--radius-xl)',
  background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)',
  color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease',
  minHeight: '56px', fontSize: 'var(--fs-body)', fontWeight: '700',
  textDecoration: 'none',
};

export default function SettingsPage({ setView }) {
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);

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
          {/* Recitation Map */}
          <button
            onClick={() => setView('recitation-map')}
            style={pill}
            className="hover-scale"
            title="Recitation Map"
          >
            <BookOpen size={18} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Recitation Map</span>
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>

          {/* Audio Manager */}
          <button
            onClick={() => setView('audio-manager')}
            style={pill}
            className="hover-scale"
            title="Audio Manager"
          >
            <Volume2 size={18} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Audio Manager</span>
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>

          {/* Email */}
          <a
            href="mailto:ahmadmusamuhd@gmail.com"
            style={linkPill}
            className="hover-scale"
            title="Send an Email"
          >
            <Mail size={18} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Email</span>
            <div style={{ width: '16px' }} />
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/ahmad-m-musa-b93587156/"
            target="_blank"
            rel="noopener noreferrer"
            style={linkPill}
            className="hover-scale"
            title="Send a DM"
          >
            <Link size={18} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>LinkedIn</span>
            <div style={{ width: '16px' }} />
          </a>

          {/* Data Sources */}
          <button
            onClick={() => setDataSourcesOpen(!dataSourcesOpen)}
            style={pill}
            className="hover-scale"
          >
            <Database size={18} color="var(--accent-gold)" strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'center' }}>Data Sources</span>
            <ChevronDown
              size={16}
              color="var(--text-muted)"
              style={{
                transform: dataSourcesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
          {dataSourcesOpen && (
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
              background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-3)', boxShadow: 'var(--glass-shadow)'
            }}>
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
                  className="hover-scale"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    fontSize: 'var(--fs-secondary)', textDecoration: 'none',
                    color: 'var(--text-secondary)', padding: '0.7rem 0.6rem',
                    borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                  }}
                >
                  <span style={{ color: 'var(--accent-gold)', fontWeight: '800' }}>{src.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                  <span style={{ flex: 1 }}>{src.desc}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
