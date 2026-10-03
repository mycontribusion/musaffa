import { Trash2 } from 'lucide-react';

/**
 * ConfigActionButton — renders either "Save Preset" (in edit mode)
 * or "Start Musaffa Session" with disabled state when range is invalid.
 *
 * In edit mode a "Delete Preset" action sits beside Save. It only appears when
 * `canDeletePreset` is true, which the usePresets hook derives from the live
 * collection size — so with a single preset left there is nothing destructive
 * to offer and the button is omitted rather than rendered disabled.
 *
 * Confirmation uses window.confirm, matching the existing pattern in
 * WeaknessTracker's "Clear All" (the app has no shared modal primitive).
 * Deleting is destructive and irreversible, and this keeps the confirm step
 * consistent with the rest of the codebase instead of introducing a one-off
 * dialog.
 */
export const ConfigActionButton = ({
  isRangeValid,
  onStart,
  presetEditingIndex,
  onSavePreset,
  onDeletePreset,
  canDeletePreset,
  presetLabel,
  params,
}) => {
  if (presetEditingIndex !== null) {
    const handleDelete = () => {
      const name = presetLabel || params?.label;
      const question = name
        ? `Delete preset "${name}"? This cannot be undone.`
        : 'Delete this preset? This cannot be undone.';
      if (window.confirm(question)) onDeletePreset?.(presetEditingIndex);
    };

    // When Delete is unavailable the row collapses back to a single full-width
    // Save button, so the last remaining preset still gets the widest target.
    const showDelete = Boolean(canDeletePreset);

    // `auto` lets Delete shrink to its icon while Save claims the 1fr remainder.
    // Equal-width columns would make an icon-only button look accidental.
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showDelete ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: '0.6rem',
        }}
      >
        {showDelete && (
          <button
            onClick={handleDelete}
            className="btn-danger-ghost"
            aria-label="Delete preset"
            title="Delete preset"
          >
            <Trash2 size={15} strokeWidth={2} />
          </button>
        )}

        <button
          onClick={() => onSavePreset && onSavePreset({ ...params })}
          className="btn-primary"
          style={{ width: '100%', padding: '1.1rem', fontSize: 'var(--fs-body)', background: 'var(--accent-emerald)', color: '#000' }}
        >
          Save Preset
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={!isRangeValid}
      className="btn-primary"
      style={{
        width: '100%', padding: '1.1rem', fontSize: 'var(--fs-body)',
        opacity: isRangeValid ? 1 : 0.3,
        cursor: isRangeValid ? 'pointer' : 'not-allowed',
      }}
    >
      Start Musaffa Session
    </button>
  );
};
