import React from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';

const SurahList = ({
  surahs,
  recentSurahs,
  searchQuery,
  setSearchQuery,
  handleSelectSurah,
  setView,
}) => {
  const filteredSurahs = surahs.filter((s) =>
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.includes(searchQuery)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }} 
      style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '3rem' }}
    >
      {/* Search Section */}
      <div className="search-input-wrapper" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Search className="search-icon" size={18} strokeWidth={2} />
        <input
          type="text"
          placeholder="Search Surah..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Recent Reads */}
      {recentSurahs.length > 0 && searchQuery === '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="section-label" style={{ paddingLeft: '0.25rem' }}>Continue Reading</div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', paddingLeft: '0.25rem' }}>
            {recentSurahs.map((s) => (
              <motion.button
                key={s.number}
                whileHover={{ y: -2 }}
                onClick={() => { handleSelectSurah(s); setView('detail'); }}
                className="glass-card"
                style={{ flexShrink: 0, width: '150px', padding: '1rem', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-gold)', opacity: 0.6 }}>{s.number}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <p className="arabic" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{s.name}</p>
                  <p style={{ fontSize: '0.65rem', fontWeight: '500', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.englishName}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
          <div className="section-label">Surah Library</div>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>{filteredSurahs.length} Chapters</span>
        </div>

        <div className="grid md:grid-cols-2" style={{ gap: '1rem' }}>
          {filteredSurahs.map((surah) => (
            <motion.div
              key={surah.number}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => { handleSelectSurah(surah); setView('detail'); }}
              className="glass-card"
              style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'var(--bg-accent)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
                  {surah.number}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{surah.englishName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{surah.numberOfAyahs} Ayahs</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '0.1rem' }}>
                <span className="arabic" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{surah.name}</span>
                <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SurahList;
