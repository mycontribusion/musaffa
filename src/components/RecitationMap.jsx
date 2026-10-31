import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { normalizeAyahWords, buildWordKey } from '../utils/quranUtils';

const STATUS_COLORS = {
  correct: { color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.15)' },
  substitution: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  omission: { color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.15)' },
  insertion: { color: 'var(--text-muted)', bg: 'var(--bg-accent)' },
};

export default function RecitationMap({ surahs, quranAr, quranSimple, wordResults, setView, returnView = 'list' }) {
  const [selectedSurah, setSelectedSurah] = useState(null);

  const eligibleSurahs = useMemo(() => {
    // Map surah number → set of assessed verse numbers, derived from the
    // canonical word keys `{surahNumber}|{numberInSurah}|{wordIndex}`.
    const map = new Map();
    Object.keys(wordResults || {}).forEach((key) => {
      const parts = key.split('|');
      if (parts.length >= 3) {
        const sn = Number(parts[0]);
        const an = Number(parts[1]);
        if (!map.has(sn)) map.set(sn, new Set());
        map.get(sn).add(an);
      }
    });
    return map;
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
        <div style={{ position: 'sticky', top: 0, zIndex: 'var(--z-header)', width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0, backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: 'var(--border-hairline)' }}>
          <div className="app-container">
            <div className="flex items-center justify-between py-2" style={{ paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <button onClick={() => setView(returnView)} className="icon-btn"><ChevronLeft size={18} /></button>
                <h1 style={{ fontSize: 'var(--fs-page)', fontWeight: 'var(--fw-strong)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><BookOpen size={18} color="var(--accent-gold)" /> Recitation Map</h1>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          {eligibleSurahs.size === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-secondary)', textAlign: 'center', padding: 'var(--space-8)' }}>
              No Smart Mode word results yet. Start a Smart Mode session to build your Recitation Map.
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-secondary)' }}>{eligibleSurahs.size} surah{eligibleSurahs.size === 1 ? '' : 's'} with Smart Mode word results.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(surahs || [])
                  .filter((s) => eligibleSurahs.has(s.number))
                  .sort((a, b) => a.number - b.number)
                  .map((s) => {
                    const assessedVerses = eligibleSurahs.get(s.number) || new Set();
                    const verseCount = s.numberOfAyahs || 0;
                    const assessedCount = assessedVerses.size;
                    return (
                      <button
                        key={s.number}
                        onClick={() => setSelectedSurah(s)}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0.75rem var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--bg-accent)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--accent-gold-soft)', color: 'var(--accent-gold)', fontWeight: '700', fontSize: 'var(--fs-body-sm)' }}>
                          {s.number}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: 'var(--fs-body)' }}>{s.englishName}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-micro)' }}>
                            {assessedCount} of {verseCount} verses assessed
                          </div>
                        </span>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  const surah = selectedSurah;
  const arAyahs = quranAr?.surahs?.[surah?.number - 1]?.ayahs || [];

  // Swipe left/right to walk through surahs, the same way SurahDetail does.
  // Dragging right (offset.x > 0) reveals the next clickable surah; dragging
  // left (offset.x < 0) reveals the previous clickable one. Non-eligible
  // surahs (no Smart Mode results) are skipped entirely, so navigation never
  // lands on a surah the user cannot open.
  const handleDragEnd = (event, info) => {
    const threshold = 100;
    const velocity = 500;
    const eligible = (surahs || [])
      .filter((s) => eligibleSurahs.has(s.number))
      .sort((a, b) => a.number - b.number);
    const idx = eligible.findIndex((s) => s.number === surah.number);
    if (idx === -1) return;
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      const next = eligible[idx + 1];
      if (next) setSelectedSurah(next);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      const prev = eligible[idx - 1];
      if (prev) setSelectedSurah(prev);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd} className="pb-24">
      <div style={{ position: 'sticky', top: 0, zIndex: 'var(--z-header)', width: '100vw', marginLeft: 'calc(50% - 50vw)', flexShrink: 0, backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: 'var(--border-hairline)' }}>
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