import React from 'react';
import { motion } from 'framer-motion';
import { Search, Download, CheckCircle, Loader, BrainCircuit, Zap } from 'lucide-react';

const SurahList = ({
  surahs,
  recentSurahs,
  handleSelectSurah,
  setView,
  audioDownloadControls,
  savedMusaffaSession,
  resumeMusaffaSession,
  clearMusaffaSession,
  startQuiz,
  setPartnerSubView,
  setMusaffaParams
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Guard against empty surahs array
  if (!surahs || surahs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading surahs...
      </div>
    );
  }

  const filteredSurahs = surahs.filter((s) => {
    const matchesSearch = s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) || s.name.includes(searchQuery);
    return matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '3rem', paddingTop: '1.5rem' }}
    >
      {/* Quick Actions */}
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', padding: '0 0.5rem' }}>
        <button
          onClick={() => { 
            setMusaffaParams(prev => ({ ...prev, autoNext: true, errorDetection: true }));
            setView('partner'); 
            setPartnerSubView('config'); 
          }}
          className="glass-card hover-scale"
          style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrainCircuit size={20} color="var(--accent-gold)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', display: 'block' }}>Smart Musaffa</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>AI Recitation Partner</span>
          </div>
        </button>
        <button
          onClick={() => setView('mutashabihat-selection')}
          className="glass-card hover-scale"
          style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="var(--accent-gold)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', display: 'block' }}>Mutashabih Quiz</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Global Challenge</span>
          </div>
        </button>
      </div>

      {/* Search Section */}
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', padding: '0 0.5rem' }}>
        <div className="search-input-wrapper" style={{ width: '100%' }}>
          <Search className="search-icon" size={18} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search Surah..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Resume Session Banner */}
      {savedMusaffaSession && searchQuery === '' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 'var(--radius-lg)', padding: '1rem',
          margin: '0 0.5rem',
        }}>
          <div>
            <p style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--accent-gold)' }}>Active Mudarasa Session</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {savedMusaffaSession.surahNumber
                ? `Surah ${savedMusaffaSession.surahNumber} · Chunk ${savedMusaffaSession.chunkIndex + 1}`
                : 'Continue your recitation'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={clearMusaffaSession} style={{
              padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
              background: 'var(--bg-accent)', color: 'var(--text-secondary)', fontSize: '0.75rem',
              fontWeight: '700', cursor: 'pointer',
            }}>Dismiss</button>
            <button onClick={resumeMusaffaSession} style={{
              padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-gold)',
              background: 'var(--accent-gold)', color: '#000', fontSize: '0.75rem',
              fontWeight: '800', cursor: 'pointer',
            }}>Resume</button>
          </div>
        </div>
      )}

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
              onClick={() => {
                handleSelectSurah(surah);
                setView('detail');
              }}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {audioDownloadControls?.isSurahAudioDownloaded(surah.number) ? (
                    <CheckCircle size={14} style={{ color: 'var(--accent-emerald)', opacity: 0.8 }} />
                  ) : audioDownloadControls?.downloadStatus?.isDownloading && audioDownloadControls?.downloadStatus?.surahNumber === surah.number ? (
                    <Loader size={14} className="animate-spin" style={{ color: 'var(--accent-gold)' }} />
                  ) : (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        audioDownloadControls?.downloadSurahAudio(surah.number);
                      }}
                      style={{ padding: '0.2rem', margin: '-0.2rem', color: 'var(--text-muted)' }}
                      className="hover:text-[var(--accent-gold)] transition-colors"
                    >
                      <Download size={14} />
                    </div>
                  )}
                  {/* <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.5 }} /> */}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SurahList;
