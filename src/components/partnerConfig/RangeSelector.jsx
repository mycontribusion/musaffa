import { AlertCircle } from 'lucide-react';

const sectionLabel = {
  fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem',
};

const selectStyle = {
  background: 'var(--bg-accent)', color: 'var(--text-primary)',
  border: '1px solid var(--glass-border)', padding: '0.75rem 0.5rem',
  borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.85rem',
  minWidth: 0,
};

/**
 * RangeSelector — Start From / End At dropdowns + validation banner.
 */
export const RangeSelector = ({
  surahs,
  params,
  onChange,
  startAyahCount,
  endAyahCount,
  isRangeValid,
  onStartSurahChange,
  onStartAyahChange,
}) => (
  <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Start From */}
      <div>
        <div style={sectionLabel}>Start From</div>
        <div style={{ display: 'flex', gap: '0.4rem', overflow: 'hidden' }}>
          <select
            value={params.startSurah}
            onChange={e => onStartSurahChange(Number(e.target.value))}
            style={{ ...selectStyle, flex: '1.8' }}
          >
            {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
          </select>
          <select
            value={params.startAyah}
            onChange={e => onStartAyahChange(Number(e.target.value))}
            style={{ ...selectStyle, flex: '1', textAlign: 'center' }}
          >
            {Array.from({ length: startAyahCount }, (_, i) => i + 1).map(n =>
              <option key={n} value={n}>Ayah {n}</option>)}
          </select>
        </div>
      </div>

      {/* End At */}
      <div>
        <div style={sectionLabel}>End At</div>
        <div style={{ display: 'flex', gap: '0.4rem', overflow: 'hidden' }}>
          <select
            value={params.endSurah}
            onChange={e => onChange('endSurah', Number(e.target.value))}
            style={{ ...selectStyle, flex: '1.8' }}
          >
            {surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
          </select>
          <select
            value={params.endAyah}
            onChange={e => onChange('endAyah', Number(e.target.value))}
            style={{ ...selectStyle, flex: '1', textAlign: 'center' }}
          >
            {Array.from({ length: endAyahCount }, (_, i) => i + 1).map(n =>
              <option key={n} value={n}>Ayah {n}</option>)}
          </select>
        </div>
      </div>
    </div>

    {/* Validation error */}
    {!isRangeValid && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)',
        fontSize: '0.75rem', fontWeight: '700', background: 'rgba(239,68,68,0.1)',
        padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)'
      }}>
        <AlertCircle size={13} /><span>Start must be earlier than End.</span>
      </div>
    )}
  </>
);
