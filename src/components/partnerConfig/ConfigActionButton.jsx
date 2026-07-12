/**
 * ConfigActionButton — renders either "Save Preset" (in edit mode)
 * or "Start Musaffa Session" with disabled state when range is invalid.
 */
export const ConfigActionButton = ({ isRangeValid, onStart, presetEditingIndex, onSavePreset, params }) => {
  if (presetEditingIndex !== null) {
    return (
      <button
        onClick={() => onSavePreset && onSavePreset({ ...params })}
        className="btn-primary"
        style={{ width: '100%', padding: '1.1rem', fontSize: '0.9rem', background: 'var(--accent-emerald)', color: '#000' }}
      >
        Save Preset
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={!isRangeValid}
      className="btn-primary"
      style={{
        width: '100%', padding: '1.1rem', fontSize: '0.9rem',
        opacity: isRangeValid ? 1 : 0.3,
        cursor: isRangeValid ? 'pointer' : 'not-allowed',
      }}
    >
      Start Musaffa Session
    </button>
  );
};
