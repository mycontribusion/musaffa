import React from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle, BrainCircuit, Pencil, Plus, Play, Mic, Hand, BookOpen, ScrollText } from 'lucide-react';
import { useQuranSearch } from '../hooks/useQuranSearch';
import { buildJuzList, buildHizbList } from '../utils/quranDivisions';
import { ResumeBanner } from './partnerConfig/ResumeBanner';

const SurahList = ({
  surahs,
  quranAr,
  quranEn,
  recentSurahs,
  lastRead,
  updateLastRead,
  handleSelectSurah,
  openAyah,
  setTargetAyah,
  setDetailReturnView,
  setView,
  setSelectedJuz,
  setSelectedHizb,
  audioDownloadControls,
  savedMusaffaSession,
  resumeMusaffaSession,
  clearMusaffaSession,
  startQuiz,
  setPartnerSubView,
  setMusaffaParams,
  musaffaPresets,
  setMusaffaPresets,
  startMusaffaFromPreset,
  editPreset,
  createPreset,
  exitPresetEditing,
  initialScrollPos,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState(() => sessionStorage.getItem('surahListTab') || 'surah');
  React.useEffect(() => { sessionStorage.setItem('surahListTab', activeTab); }, [activeTab]);
  const quranSurahs = quranAr?.data?.surahs || quranAr?.surahs || [];
  const juzList = React.useMemo(() => (quranSurahs.length ? buildJuzList(quranSurahs) : []), [quranSurahs]);
  const hizbList = React.useMemo(() => (quranSurahs.length ? buildHizbList(quranSurahs) : []), [quranSurahs]);

  React.useLayoutEffect(() => {
    if (initialScrollPos != null && initialScrollPos > 0) {
      window.scrollTo(0, initialScrollPos);
      const raf = requestAnimationFrame(() => {
        window.scrollTo(0, initialScrollPos);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const { isSearching, surahResults, ayahResults, totalAyahMatches, isTruncated } =
    useQuranSearch(searchQuery, { quranAr, quranEn, surahs });

  // Look up the surah for the lastRead entry
  const surah = lastRead ? surahs.find(s => s.number === lastRead.surahNumber) : null;
  const surahName = surah ? surah.name : '';
  const surahEnglishName = surah ? surah.englishName : '';

  const handleEntryClick = (entry) => {
    if (!entry) return;
    const mode = entry.mode || 'surah';
    const divisionNumber = entry.divisionNumber;
    const ayahNumber = entry.ayahNumber;

    if (mode === 'juz' && divisionNumber) {
      setSelectedJuz(divisionNumber);
      setView('juz');
      setTargetAyah(ayahNumber);
    } else if (mode === 'hizb' && divisionNumber) {
      setSelectedHizb(divisionNumber);
      setView('hizb');
      setTargetAyah(ayahNumber);
    } else {
      // Default to surah mode
      const s = surahs.find(x => x.number === entry.surahNumber);
      if (s) {
        handleSelectSurah(s);
        setView('detail');
        setTargetAyah(ayahNumber);
      }
    }
  };

  // Guard against empty surahs array
  if (!surahs || surahs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Loading surahs...
      </div>
    );
  }

  // With no query the search hook returns an empty result set (it only reports
  // *matches*), so fall back to the full library. This preserves the original
  // behaviour where an empty search box renders all 114 surahs.
  const filteredSurahs = isSearching ? surahResults : surahs;
  const hasAyahResults = ayahResults.length > 0;
  const noResults = isSearching && filteredSurahs.length === 0 && !hasAyahResults;

  const getSurahMeta = (num) => surahs.find(s => s.number === num);

  const highlightColor = (arabic) =>
    arabic
      ? { color: 'var(--accent-gold)', fontWeight: '800' }
      : { color: 'var(--accent-emerald)', fontWeight: '700' };

  const getModeLabel = (preset) => {
    if (preset.errorDetection) return { label: 'Smart', color: 'var(--accent-emerald)', Icon: BrainCircuit };
    if (preset.autoNext) return { label: 'Hands-Free', color: 'var(--accent-emerald)', Icon: Mic };
    return { label: 'Manual', color: 'var(--accent-gold)', Icon: Hand };
  };

  const getSurahName = (num) => surahs.find(s => s.number === num)?.englishName || `Surah ${num}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: 'var(--space-8)', paddingTop: 'var(--space-5)' }}
    >
      {/* Quick Actions */}
      <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'stretch', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => {
              exitPresetEditing?.();
              setMusaffaParams(prev => ({ ...prev, autoNext: true, errorDetection: true }));
              setView('partner');
              setPartnerSubView('config');
            }}
            style={{
              flexShrink: 0, minWidth: '200px', maxWidth: '220px',
              background: 'var(--gold-gradient)', border: 'none',
              boxShadow: 'var(--glass-shadow)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--space-2)', cursor: 'pointer',
            }}
            className="hover-scale"
          >
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-on-gold)' }}>Start Musaffa</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-on-gold)', opacity: 0.9 }}>Recitation patner</span>
          </button>

          {musaffaPresets && musaffaPresets.length > 0 && musaffaPresets.map((preset, idx) => {
            const mode = getModeLabel(preset);
            const ModeIcon = mode.Icon;
            const startName = getSurahName(preset.startSurah);
            const endName = getSurahName(preset.endSurah);
            const rangeLabel = preset.startSurah === preset.endSurah ? startName : `${startName} → ${endName}`;
            return (
              <div key={idx} style={{
                flexShrink: 0, minWidth: '200px', maxWidth: '220px',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 'var(--fw-strong)', fontSize: 'var(--fs-body)', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {preset.label}
                    </p>
                    <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', margin: '0.2rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rangeLabel}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); editPreset(idx); }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: '2px', flexShrink: 0, borderRadius: '6px',
                  }} title="Edit preset">
                    <Pencil size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
                    background: `${mode.color}18`, border: `1px solid ${mode.color}40`,
                    flexShrink: 0,
                  }}>
                    <ModeIcon size={14} style={{ color: mode.color }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: '22px', height: '20px', padding: '0 0.35rem',
                      borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                      background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)', textTransform: 'uppercase',
                    }}>
                      {preset.portion === 'verse' ? 'V' :
                       preset.portion === 'third' ? 'T' :
                       preset.portion === 'half' ? 'H' :
                       preset.portion === 'page' ? 'P' :
                       preset.portion === 'rubu' ? 'R' : 'Z'}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: '22px', height: '20px', padding: '0 0.35rem',
                      borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                      background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)', textTransform: 'uppercase',
                    }}>
                      {preset.whoStarts === 'app' ? 'A' : 'U'}
                    </span>
                    {preset.autoNext && !preset.errorDetection && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: '22px', height: '20px', padding: '0 0.35rem',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                        background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                      }}>
                        {Math.round(((40 - (preset.micSensitivity ?? 15)) / 35) * 90 + 10)}%
                      </span>
                    )}
                    {preset.errorDetection && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: '22px', height: '20px', padding: '0 0.35rem',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                        background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                      }}>
                        {preset.errorThreshold ?? 50}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => startMusaffaFromPreset(preset)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    background: 'var(--gold-gradient)', color: 'var(--text-on-gold)',
                    border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem',
                    fontWeight: 'var(--fw-strong)', fontSize: 'var(--fs-secondary)', cursor: 'pointer', width: '100%',
                  }}
                >
                  <Play size={13} fill="currentColor" /> Start
                </button>
              </div>
            );
          })}
          <button
            onClick={createPreset}
            className="preset-add-btn"
            aria-label="Create new Musaffa preset"
            title="Create new preset"
            style={{ flexShrink: 0, alignSelf: 'center' }}
          >
            <Plus size={14} />
          </button>
        </div>

        {savedMusaffaSession && searchQuery === '' && (
          <div style={{ width: '100%' }}>
            <ResumeBanner
              savedSession={savedMusaffaSession}
              onResume={resumeMusaffaSession}
              onDismiss={clearMusaffaSession}
            />
          </div>
        )}

        <button
          onClick={() => setView('mutashabihat-selection')}
          className="hover-scale"
          style={{ padding: '1.75rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', border: '1px solid #334155', background: '#334155', boxShadow: 'var(--glass-shadow)', borderRadius: 'var(--radius-lg)', width: '100%' }}
        >
          <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff' }}>Mutashabih Quiz</span>
          <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>Global Challenge</span>
        </button>
      </div>

      {/* Quick Start Presets */}
      {false && musaffaPresets && musaffaPresets.length > 0 && (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', padding: '0 0.5rem' }}>
          {/* Header row: title group pinned left, create button pushed to the far
              right of the same row and vertically centred against the title. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Play size={13} color="var(--accent-gold)" />
              <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Quick Start Musaffa</span>
            </div>

            {/* Icon-only, same footprint and hover treatment as the per-card
                Pencil button below, so the two read as siblings. Creates the
                preset through the existing usePresets flow, which appends it
                and opens the existing preset editor on it. */}
            <button
              onClick={createPreset}
              className="preset-add-btn"
              aria-label="Create new Musaffa preset"
              title="Create new preset"
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {musaffaPresets.map((preset, idx) => {
              const mode = getModeLabel(preset);
              const ModeIcon = mode.Icon;
              const startName = getSurahName(preset.startSurah);
              const endName = getSurahName(preset.endSurah);
              const rangeLabel = preset.startSurah === preset.endSurah ? startName : `${startName} → ${endName}`;
              return (
                <div key={idx} style={{
                  flexShrink: 0, minWidth: '200px', maxWidth: '220px',
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 'var(--fw-strong)', fontSize: 'var(--fs-body)', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {preset.label}
                      </p>
                      <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)', margin: '0.2rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rangeLabel}
                      </p>
                    </div>
                    <button onClick={() => editPreset(idx)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      padding: '2px', flexShrink: 0, borderRadius: '6px',
                    }} title="Edit preset">
                      <Pencil size={14} />
                    </button>
                  </div>

                  {/* Mode badge + settings indicators - all on one line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Mode icon only */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
                      background: `${mode.color}18`, border: `1px solid ${mode.color}40`,
                      flexShrink: 0,
                    }}>
                      <ModeIcon size={14} style={{ color: mode.color }} />
                    </div>
                    {/* Compact settings row - only show relevant settings per mode */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {/* Portion - always shown */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: '22px', height: '20px', padding: '0 0.35rem',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                        background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)', textTransform: 'uppercase',
                      }}>
                        {preset.portion === 'verse' ? 'V' :
                         preset.portion === 'third' ? 'T' :
                         preset.portion === 'half' ? 'H' :
                         preset.portion === 'page' ? 'P' :
                         preset.portion === 'rubu' ? 'R' : 'Z'}
                      </span>
                      {/* Who Starts - always shown */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: '22px', height: '20px', padding: '0 0.35rem',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                        background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)', textTransform: 'uppercase',
                      }}>
                        {preset.whoStarts === 'app' ? 'A' : 'U'}
                      </span>
                      {/* Mic Sensitivity - only for Hands-Free (autoNext but not errorDetection) */}
                      {preset.autoNext && !preset.errorDetection && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: '22px', height: '20px', padding: '0 0.35rem',
                          borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                          background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                          color: 'var(--text-secondary)',
                        }}>
                          {Math.round(((40 - (preset.micSensitivity ?? 15)) / 35) * 90 + 10)}%
                        </span>
                      )}
                      {/* Error Threshold - only for Smart (errorDetection) */}
                      {preset.errorDetection && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: '22px', height: '20px', padding: '0 0.35rem',
                          borderRadius: 'var(--radius-sm)', fontSize: '0.6rem', fontWeight: '800',
                          background: 'var(--bg-accent)', border: '1px solid var(--glass-border)',
                          color: 'var(--text-secondary)',
                        }}>
                          {preset.errorThreshold ?? 50}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Start button */}
                  <button
                    onClick={() => startMusaffaFromPreset(preset)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      background: 'var(--gold-gradient)', color: 'var(--text-on-gold)',
                      border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem',
                      fontWeight: 'var(--fw-strong)', fontSize: 'var(--fs-secondary)', cursor: 'pointer', width: '100%',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Play size={13} fill="currentColor" /> Start
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Search moved to dedicated search page */}

      {/* Ayah / Content Results */}
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
                <motion.button
                  key={`${r.surahNumber}:${r.ayahNumber}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => openAyah(r.surahNumber, r.ayahNumber)}
                  className="glass-card"
                  style={{
                    padding: 'var(--space-4)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: 'var(--border-hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="arabic" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {meta ? meta.name : `Surah ${r.surahNumber}`}
                    </span>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: '800', color: 'var(--text-muted)' }}>
                      {meta ? meta.englishName : ''} · Ayah {r.ayahNumber}
                    </span>
                  </div>

                  <p className="arabic" style={{ fontSize: '1.05rem', lineHeight: 2, color: 'var(--text-primary)', margin: 0 }}>
                    {r.arabic.clippedStart && <span style={{ opacity: 0.45 }}>… </span>}
                    {r.arabic.segments.map((seg, i) => (
                      <span key={i} style={seg.match ? highlightColor(true) : undefined}>{seg.text}{' '}</span>
                    ))}
                    {r.arabic.clippedEnd && <span style={{ opacity: 0.45 }}>…</span>}
                  </p>

                  <p style={{ fontSize: 'var(--fs-body-sm)', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
                    {r.english.clippedStart && <span style={{ opacity: 0.45 }}>… </span>}
                    {r.english.segments.map((seg, i) => (
                      <span key={i} style={seg.match ? highlightColor(false) : undefined}>{seg.text}{' '}</span>
                    ))}
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

      {/* No Results */}
      {noResults && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: '3rem 1rem', textAlign: 'center' }}>
          <Search size={28} color="var(--text-muted)" />
          <p style={{ fontSize: 'var(--fs-body)', fontWeight: '700', color: 'var(--text-secondary)', margin: 0 }}>No results</p>
          <p style={{ fontSize: 'var(--fs-secondary)', color: 'var(--text-muted)', margin: 0 }}>
            Try a surah name, or a word from the Arabic text or the translation.
          </p>
        </div>
      )}

      {/* Continue Reading */}
      {lastRead.length > 0 && searchQuery === '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="section-label" style={{ paddingLeft: '0.25rem' }}>Continue Reading</div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)', paddingLeft: '0.25rem' }}>
            {lastRead.map((entry) => {
              const s = surahs.find(x => x.number === entry.surahNumber);
              const surahName = s ? s.name : '';
              const surahEnglishName = s ? s.englishName : '';
              return (
                <motion.button
                  key={`${entry.surahNumber}:${entry.mode}:${entry.divisionNumber || 0}`}
                  whileHover={{ y: -2 }}
                  onClick={() => handleEntryClick(entry)}
                  className="glass-card"
                  style={{ flexShrink: 0, width: '170px', padding: 'var(--space-4)', textAlign: 'left', cursor: 'pointer', border: 'var(--border-hairline)' }}
                >
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '800', color: 'var(--accent-gold)' }}>
                      {entry.surahNumber}:{entry.ayahNumber}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    {entry.mode === 'surah' ? (
                      <>
                        <p className="arabic" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{surahName}</p>
                        <p style={{ fontSize: 'var(--fs-meta)', fontWeight: '800', color: 'var(--accent-gold)' }}>Surah</p>
                      </>
                    ) : (
                      <>
                        <p className="arabic" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{surahName}</p>
                        <p style={{ fontSize: 'var(--fs-meta)', fontWeight: '800', color: 'var(--accent-gold)', textTransform: 'capitalize' }}>
                          {entry.mode === 'juz' ? "Juz'" : 'Hizb'} {entry.divisionNumber}
                        </p>
                      </>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '0 0.5rem' }}>
        {['surah', 'hizb', 'juz'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className="glass-card" style={{ padding: '0.5rem 1rem', fontWeight: 700, textTransform: 'capitalize', background: activeTab === t ? 'var(--accent-gold)' : undefined, color: activeTab === t ? '#000' : undefined }}>
            {t === 'juz' ? "Juz'" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {isSearching && filteredSurahs.length > 0 && <BookOpen size={13} color="var(--accent-gold)" />}
            {activeTab === 'hizb' ? 'Hizb Library' : activeTab === 'juz' ? "Juz' Library" : (isSearching ? 'Surahs' : 'Surah Library')}
          </div>
          <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '700', color: 'var(--text-muted)' }}>
            {activeTab === 'hizb' ? hizbList.length : activeTab === 'juz' ? juzList.length : filteredSurahs.length} {activeTab === 'hizb' ? 'Hizbs' : activeTab === 'juz' ? "Juz'" : (isSearching ? (filteredSurahs.length === 1 ? 'Match' : 'Matches') : 'Chapters')}
          </span>
        </div>

        {activeTab === 'surah' && (
        <div className="grid md:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: 'var(--bg-accent)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-body-sm)', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {surah.number}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <h3 style={{ fontSize: 'var(--fs-card)', fontWeight: '700', color: 'var(--text-primary)' }}>{surah.englishName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: 'var(--fs-meta)', fontWeight: '500', color: 'var(--text-muted)' }}>{surah.numberOfAyahs} Ayahs</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '0.1rem' }}>
                <span className="arabic" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{surah.name}</span>
                {/* Informational mark only: audio downloads are managed in the Audio Manager.
                    Rendered for surahs already downloaded for the active reciter; nothing at all
                    is rendered (no empty action slot) for surahs that are not downloaded. */}
                {audioDownloadControls?.isSurahAudioDownloaded(surah.number) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <CheckCircle size={14} style={{ color: 'var(--accent-emerald)' }} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        )}
        {activeTab !== 'surah' && (
          <div className="grid md:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
            {(activeTab === 'hizb' ? hizbList : juzList).map((d) => (
              <div key={d.hizb || d.juz} className="glass-card" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => {
                if (activeTab === 'juz') {
                  setSelectedJuz(d.juz);
                  setView('juz');
                } else if (activeTab === 'hizb') {
                  setSelectedHizb(d.hizb);
                  setView('hizb');
                }
              }}>
                <strong>{activeTab === 'hizb' ? `Hizb ${d.hizb}` : `Juz' ${d.juz}`}</strong>
                <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-muted)' }}>
                  {surahs.find(s => s.number === d.start.surah)?.englishName || `Surah ${d.start.surah}`} {d.start.surah}:{d.start.ayah} – {surahs.find(s => s.number === d.end.surah)?.englishName || `Surah ${d.end.surah}`} {d.end.surah}:{d.end.ayah}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SurahList;
