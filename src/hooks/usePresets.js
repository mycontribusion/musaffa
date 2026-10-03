import { useState, useCallback, useEffect } from 'react';

const DEFAULT_PRESETS = [
  { label: 'Juz Amma', startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false },
  { label: 'Al-Baqarah', startSurah: 2, startAyah: 1, endSurah: 2, endAyah: 286, portion: 'half', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: true },
  { label: 'Al-Kahf', startSurah: 18, startAyah: 1, endSurah: 18, endAyah: 110, portion: 'page', whoStarts: 'app', autoNext: true, micSensitivity: 15, errorDetection: false },
];

export const usePresets = (setMusaffaParams, startMusaffa, setView, setPartnerSubView) => {
  const [musaffaPresets, setMusaffaPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('quran_musaffa_presets') || 'null') || DEFAULT_PRESETS; } catch { return DEFAULT_PRESETS; }
  });
  const [presetEditingIndex, setPresetEditingIndex] = useState(null);

  useEffect(() => { localStorage.setItem('quran_musaffa_presets', JSON.stringify(musaffaPresets)); }, [musaffaPresets]);

  /* Leaves preset-editing mode without touching the preset collection.

     `presetEditingIndex` is the ONLY thing that decides whether PartnerConfig
     renders as the plain Musaffa config screen or as the preset editor, so it
     must be cleared by every route that is not "open the editor". Without this,
     abandoning the editor via the back button (which only calls setView) and
     then opening Smart Musaffa would resurrect the editor — showing Preset
     Name / Save / Delete and hiding the real Start Musaffa action. */
  const exitPresetEditing = useCallback(() => {
    setPresetEditingIndex(null);
  }, []);

  const startMusaffaFromPreset = useCallback((preset) => {
    // Pressing Start on a preset card is a session launch, not an edit.
    setPresetEditingIndex(null);
    setMusaffaParams(preset);
    setTimeout(() => {
      startMusaffa(null, 0, preset.whoStarts === 'user' ? 'user' : 'app', preset);
    }, 0);
    setView('partner');
  }, [startMusaffa, setView, setMusaffaParams]);

  const editPreset = useCallback((index) => {
    setPresetEditingIndex(index);
    setMusaffaParams(musaffaPresets[index]);
    setView('partner');
    setPartnerSubView('config');
  }, [musaffaPresets, setView, setPartnerSubView, setMusaffaParams]);

  /* The editor only ever deletes the preset it currently has open, so
     `canDeletePreset` is derived from `presetEditingIndex` and the live
     collection size and exposed as a plain Boolean — downstream UI reads it
     with `{canDeletePreset && ...}` rather than calling it.

     The collection is never allowed to become empty: when only one preset is
     left this is false, so the button is not rendered at all. `deletePreset`
     independently re-checks the same invariant so the rule holds even if the
     handler is invoked directly. Two guards, two jobs: one for the user, one
     for the data. */
  const canDeletePreset =
    presetEditingIndex !== null && musaffaPresets.length > 1;

  /* Removes the preset at `index` (defaults to the one open in the editor).

     Three things must happen together, or the app is left in an inconsistent
     state: the entry leaves the collection, the editing index is cleared so a
     later Save cannot write into the wrong slot, and the live Musaffa draft is
     pointed at a surviving preset. The last one matters because `musaffaParams`
     outlives this screen — leaving it on the deleted range would let a deleted
     preset's surah range silently start a later session.

     We reset to the entry that slides into the vacated slot (or the new last
     entry when the tail was deleted), which keeps the user's place in the list.
     Deleting never starts a session. */
  const deletePreset = useCallback((index = presetEditingIndex) => {
    if (index === null || index === undefined) return;
    if (musaffaPresets.length <= 1) return;

    const next = musaffaPresets.filter((_, i) => i !== index);
    setMusaffaPresets(next);

    const survivor = next[Math.min(index, next.length - 1)];
    if (survivor) setMusaffaParams(survivor);

    setPresetEditingIndex(null);
    setView('list');
  }, [presetEditingIndex, musaffaPresets, setMusaffaParams, setView]);

  const handleSavePreset = useCallback((updatedParams) => {
    setMusaffaPresets(prev => {
      const next = [...prev];
      next[presetEditingIndex] = updatedParams;
      return next;
    });
    setPresetEditingIndex(null);
    setView('list');
  }, [presetEditingIndex, setView]);

  /* Creates a new preset by appending to the SAME collection, then reuses the
     existing preset editor for it.

     The index is derived from the current list length so it always points at
     the appended entry. `handleSavePreset` already writes to
     `next[presetEditingIndex]`, so opening the editor at that index means the
     user's Save simply overwrites the placeholder we just appended — no second
     preset array, no second storage key, and the pending entry is never left
     stranded because the editor either saves over it or the user simply
     navigates away.

     The new object carries exactly the same fields as DEFAULT_PRESETS plus
     App.jsx's `errorThreshold`, so the card renders (label, range, mode badge,
     portion) and the config screen has a complete draft to edit. */
  const createPreset = useCallback(() => {
    const newPreset = {
      label: 'New Preset',
      startSurah: 1,
      startAyah: 1,
      endSurah: 1,
      endAyah: 7,
      portion: 'page',
      whoStarts: 'app',
      autoNext: true,
      micSensitivity: 15,
      errorDetection: false,
      errorThreshold: 50,
    };

    setMusaffaPresets(prev => [...prev, newPreset]);
    setPresetEditingIndex(musaffaPresets.length);
    setMusaffaParams(newPreset);
    setView('partner');
    setPartnerSubView('config');
  }, [musaffaPresets.length, setMusaffaParams, setView, setPartnerSubView]);

  return {
    musaffaPresets,
    setMusaffaPresets,
    presetEditingIndex,
    exitPresetEditing,
    startMusaffaFromPreset,
    editPreset,
    createPreset,
    canDeletePreset,
    deletePreset,
    handleSavePreset
  };
};
