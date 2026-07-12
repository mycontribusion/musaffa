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

  const startMusaffaFromPreset = useCallback((preset) => {
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

  const handleSavePreset = useCallback((updatedParams) => {
    setMusaffaPresets(prev => {
      const next = [...prev];
      next[presetEditingIndex] = updatedParams;
      return next;
    });
    setPresetEditingIndex(null);
    setView('list');
  }, [presetEditingIndex, setView]);

  return {
    musaffaPresets,
    setMusaffaPresets,
    presetEditingIndex,
    startMusaffaFromPreset,
    editPreset,
    handleSavePreset
  };
};
