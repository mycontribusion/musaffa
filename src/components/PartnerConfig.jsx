import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RangeSelector } from './partnerConfig/RangeSelector';
import { SessionModeSelector } from './partnerConfig/SessionModeSelector';
import { AdvancedSettingsPanel } from './partnerConfig/AdvancedSettingsPanel';
import { ConfigActionButton } from './partnerConfig/ConfigActionButton';

const PartnerConfig = ({
  surahs, params, onChange, onStart,
  currentVolume, reciter, setReciter,
  audioDownloadControls, sttSupported,
  presetEditingIndex, onSavePreset
}) => {
  const getAyahCount = (n) => (surahs.find(x => x.number === n)?.numberOfAyahs || 0);
  const startAyahCount = getAyahCount(params.startSurah);
  const endAyahCount = getAyahCount(params.endSurah);
  const isRangeValid =
    params.startSurah < params.endSurah ||
    (params.startSurah === params.endSurah && params.startAyah <= params.endAyah);

  const modeRef = useRef(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-scroll the active mode card into view when selection changes
  useEffect(() => {
    if (modeRef.current) modeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [params.autoNext, params.errorDetection]);

  // Auto-correct End At only when Start From >= End At
  const handleStartSurahChange = (newStartSurah) => {
    onChange('startSurah', newStartSurah);
    const startExceedsEnd =
      newStartSurah > params.endSurah ||
      (newStartSurah === params.endSurah && params.startAyah >= params.endAyah);
    if (startExceedsEnd) {
      onChange('endSurah', newStartSurah);
      onChange('endAyah', getAyahCount(newStartSurah));
    }
  };

  const handleStartAyahChange = (newStartAyah) => {
    onChange('startAyah', newStartAyah);
    const sameSurah = params.startSurah === params.endSurah;
    if (sameSurah && newStartAyah >= params.endAyah) {
      onChange('endAyah', getAyahCount(params.startSurah));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '640px', margin: '0 auto', padding: '0.5rem 0.5rem 6rem' }}
    >
      {/* Page title */}
      <div className="text-center" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {presetEditingIndex !== null ? `Edit Preset ${presetEditingIndex + 1}` : 'Musaffa Session'}
        </h2>
      </div>

      <div className="glass-card" style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <RangeSelector
          surahs={surahs}
          params={params}
          onChange={onChange}
          startAyahCount={startAyahCount}
          endAyahCount={endAyahCount}
          isRangeValid={isRangeValid}
          onStartSurahChange={handleStartSurahChange}
          onStartAyahChange={handleStartAyahChange}
        />

        <SessionModeSelector
          params={params}
          onChange={onChange}
          sttSupported={sttSupported}
          modeRef={modeRef}
        />

        <AdvancedSettingsPanel
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          params={params}
          onChange={onChange}
          reciter={reciter}
          setReciter={setReciter}
          currentVolume={currentVolume}
        />

        {/* Preset name input — edit mode only */}
        {presetEditingIndex !== null && (
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Preset Name
            </div>
            <input
              value={params.label || ''}
              onChange={e => onChange('label', e.target.value)}
              placeholder="e.g. Juz Amma"
              style={{
                width: '100%', padding: '0.75rem 1rem', outline: 'none',
                background: 'var(--bg-accent)', color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}

        <ConfigActionButton
          isRangeValid={isRangeValid}
          onStart={onStart}
          presetEditingIndex={presetEditingIndex}
          onSavePreset={onSavePreset}
          params={params}
        />

      </div>
    </motion.div>
  );
};

export default PartnerConfig;
