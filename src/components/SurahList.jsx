import React from 'react';
import { motion } from 'framer-motion';
import { Search, Book, Clock, ChevronRight } from 'lucide-react';

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
      style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '3rem' }}
    >
      {/* Search Section */}
      <div className="search-input-wrapper" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Search className="search-icon" size={20} strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search Surah (English or Arabic)..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Recent Reads */}
      {recentSurahs.length > 0 && searchQuery === '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="section-label">Continue Reading</div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', paddingLeft: '0.5rem' }}>
            {recentSurahs.map((s) => (
              <motion.button
                key={s.number}
                whileHover={{ y: -4 }}
                onClick={() => { handleSelectSurah(s); setView('detail'); }}
                className="glass-card"
                style={{ flexShrink: 0, width: '180px', padding: '1.5rem', textAlign: 'left', cursor: 'pointer', border: 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-gold)', opacity: 0.5 }}>{s.number}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p className="arabic" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{s.name}</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.englishName}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
          <div className="section-label">Surah Library</div>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>{filteredSurahs.length} Chapters</span>
        </div>

        <div className="grid md:grid-cols-2" style={{ gap: '1.5rem' }}>
          {filteredSurahs.map((surah) => (
            <motion.div
              key={surah.number}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => { handleSelectSurah(surah); setView('detail'); }}
              className="glass-card"
              style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'var(--bg-accent)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  {surah.number}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h3 style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{surah.englishName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{surah.englishNameTranslation}</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--bg-accent)' }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500' }}>{surah.numberOfAyahs} Ayahs</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '0.25rem' }}>
                <span className="arabic" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{surah.name}</span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SurahList;
