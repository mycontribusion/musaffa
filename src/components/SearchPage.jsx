import React from 'react';
import { motion } from 'framer-motion';
import { Search, ScrollText } from 'lucide-react';
import { useQuranSearch } from '../hooks/useQuranSearch';

const SearchPage = ({ surahs, quranAr, quranEn, searchQuery, openAyah, initialScrollPos }) => {
  const { isSearching, surahResults, ayahResults, totalAyahMatches, isTruncated } =
    useQuranSearch(searchQuery, { quranAr, quranEn, surahs });

  React.useLayoutEffect(() => {
    if (initialScrollPos != null && initialScrollPos > 0) {
      window.scrollTo(0, initialScrollPos);
      const raf = requestAnimationFrame(() => {
        window.scrollTo(0, initialScrollPos);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const filteredSurahs = isSearching ? surahResults : surahs;
  const hasAyahResults = ayahResults.length > 0;
  const noResults = isSearching && filteredSurahs.length === 0 && !hasAyahResults;

  const getSurahMeta = (num) => surahs.find(s => s.number === num);
  const highlightColor = (arabic) => arabic ? { color: 'var(--accent-gold)', fontWeight: '800' } : { color: 'var(--accent-emerald)', fontWeight: '700' };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', padding: '0 0.5rem' }}>
      {hasAyahResults && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ScrollText size={13} color="var(--accent-gold)" />
              Ayahs
            </div>
            <span style={{ fontSize: 'var(--fs-label)', fontWeight: '700', color: 'var(--text-muted)' }}>
              {totalAyahMatches} match{totalAyahMatches === 1 ? '' : 'es'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {ayahResults.map((r) => {
              const meta = getSurahMeta(r.surahNumber);
              return (
                <motion.button key={`${r.surahNumber}:${r.ayahNumber}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => openAyah(r.surahNumber, r.ayahNumber)} className="glass-card" style={{ padding: 'var(--space-4)', cursor: 'pointer', textAlign: 'left', border: 'var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="arabic" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{meta ? meta.name : `Surah ${r.surahNumber}`}</span>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: '800', color: 'var(--text-muted)' }}>{meta ? meta.englishName : ''} · Ayah {r.ayahNumber}</span>
                  </div>
                  <p className="arabic" style={{ fontSize: '1.05rem', lineHeight: 2, color: 'var(--text-primary)', margin: 0 }}>
                    {r.arabic.clippedStart && <span style={{ opacity: 0.45 }}>… </span>}
                    {r.arabic.segments.map((seg, i) => (<span key={i} style={seg.match ? highlightColor(true) : undefined}>{seg.text}{' '}</span>))}
                    {r.arabic.clippedEnd && <span style={{ opacity: 0.45 }}>…</span>}
                  </p>
                  <p style={{ fontSize: 'var(--fs-body-sm)', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
                    {r.english.clippedStart && <span style={{ opacity: 0.45 }}>… </span>}
                    {r.english.segments.map((seg, i) => (<span key={i} style={seg.match ? highlightColor(false) : undefined}>{seg.text}{' '}</span>))}
                    {r.english.clippedEnd && <span style={{ opacity: 0.45 }}>…</span>}
                  </p>
                </motion.button>
              );
            })}
          </div>
          {isTruncated && (
            <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>
              Showing first {ayahResults.length} of {totalAyahMatches} matches — refine your search to narrow it down.
            </p>
          )}
        </div>
      )}
      {noResults && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: '3rem 1rem', textAlign: 'center' }}>
          <Search size={28} color="var(--text-muted)" />
          <p style={{ fontSize: 'var(--fs-body)', fontWeight: '700', color: 'var(--text-secondary)', margin: 0 }}>No results</p>
          <p style={{ fontSize: 'var(--fs-secondary)', color: 'var(--text-muted)', margin: 0 }}>Try a surah name, or a word from the Arabic text or the translation.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
