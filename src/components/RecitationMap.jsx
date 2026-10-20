import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { normalizeAyahWords, buildWordKey } from '../utils/quranUtils';

const STATUS_COLORS = {
  correct: { color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.15)' },
  substitution: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  omission: { color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.15)' },
  insertion: { color: 'var(--text-muted)', bg: 'var(--bg-accent)' },
};

export default function RecitationMap({ surahs, quranAr, quranSimple, wordResults, setView }) {
  const [selectedSurah, setSelectedSurah] = useState(null);

  const eligibleSurahs = useMemo(() => {
    const set = new Set();
    Object.keys(wordResults || {}).forEach((key) => {
      const parts = key.split('|');
      if (parts.length >= 2) set.add(Number(parts[0]));
    });
    return set;
  }, [wordResults]);

  // Compute per-ayat word lists BEFORE the early return so the hook order is
  // identical whether or not a surah is selected. Without this the component
  // rendered 2 hooks on the grid view and 3 on the surah view, which React
  // rejects as "rendered more hooks than during the previous render".
  const wordsByAyah = useMemo(() => {
    const map = {};
    if (selectedSurah && quranAr && quranAr.surahs) {
      const arSurah = quranAr.surahs[selectedSurah.number - 1];
      (arSurah?.ayahs || []).forEach((a) => {
        const ws = normalizeAyahWords({ surahNumber: selectedSurah.number, numberInSurah: a.numberInSurah, text: a.text }, quranSimple);
        map[a.numberInSurah] = ws;
      });
    }
    return map;
  }, [selectedSurah, quranAr, quranSimple]);

  if (!selectedSurah) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
        <div style={{ position: 'sticky', top: 0, zIndex: 'var(--z-header)', width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0, backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)' }}>
          <div className="app-container">
            <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <button onClick={() => setView('list')} className="icon-btn"><ChevronLeft size={18} /></button>
                <h1 style={{ fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><BookOpen size={18} color="var(--accent-gold)" /> Recitation Map</h1>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-secondary)' }}>Tap a surah to review your Smart Mode word results.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-2)' }}>
            {(surahs || []).map((s) => {
              const eligible = eligibleSurahs.has(s.number);
              return (
                <button key={s.number} disabled={!eligible} onClick={() => setSelectedSurah(s)} style={{ padding: '0.6rem 0.25rem', borderRadius: 'var(--radius-md)', background: eligible ? 'var(--bg-accent)' : 'transparent', border: '1px solid var(--glass-border)', color: eligible ? 'var(--text-primary)' : 'var(--text-muted)', opacity: eligible ? 1 : 0.4, cursor: eligible ? 'pointer' : 'not-allowed', fontSize: 'var(--fs-secondary)', fontWeight: '700' }}>
                  {s.number}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  const surah = selectedSurah;
  const arAyahs = quranAr?.surahs?.[surah?.number - 1]?.ayahs || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <div style={{ position: 'sticky', top: 0, zIndex: 'var(--z-header)', width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0, backgroundColor: 'var(--bg-primary)', borderBottom: 'var(--border-hairline)' }}>
        <div className="app-container">
          <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button onClick={() => setSelectedSurah(null)} className="icon-btn"><ChevronLeft size={18} /></button>
              <h1 style={{ fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', margin: 0 }}>{surah.englishName} <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>({surah.number})</span></h1>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
        {arAyahs.map((a) => {
          const words = wordsByAyah[a.numberInSurah] || [];
          return (
            <div key={a.numberInSurah} className="glass-card" style={{ padding: 'var(--space-5)' }}>
              <p style={{ fontSize: 'var(--fs-micro)', color: 'var(--accent-gold)', fontWeight: '700', marginBottom: 'var(--space-2)' }}>Ayah {a.numberInSurah}</p>
              <p className="arabic-text" style={{ fontSize: '1.6rem', lineHeight: '2.6', direction: 'rtl', margin: 0, wordSpacing: '0.15rem' }}>
                {words.map((w, i) => {
                  const key = buildWordKey(surah.number, a.numberInSurah, i);
                  const res = wordResults && wordResults[key];
                  const cfg = res ? STATUS_COLORS[res.status] : null;
                  return (
                    <span key={i} style={{ display: 'inline-block', marginLeft: '0.3rem', color: cfg ? cfg.color : 'var(--text-primary)', background: cfg ? cfg.bg : 'transparent', borderRadius: '4px', padding: cfg ? '0 3px' : '0', fontWeight: res ? '700' : '400', opacity: res ? 1 : 0.85 }}>
                      {w}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}