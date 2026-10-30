// Build comprehensive lists of Juz' (30) and Hizb (60) divisions
// from the Quran data, each with name, start and end surah:ayah.

export const buildJuzList = (surahs) => {
  if (!surahs) return [];
  const map = new Map();
  surahs.forEach(s => {
    s.ayahs.forEach(a => {
      if (!map.has(a.juz)) map.set(a.juz, { juz: a.juz, start: { surah: s.number, ayah: a.numberInSurah }, end: null });
      map.get(a.juz).end = { surah: s.number, ayah: a.numberInSurah };
    });
  });
  return Array.from(map.values()).sort((a, b) => a.juz - b.juz);
};

export const buildHizbList = (surahs) => {
  if (!surahs) return [];
  // 60 hizb = 2 per juz; hizbQuarter 1..4 per hizb-quarter; hizb = ceil(hizbQuarter/2)
  const map = new Map();
  surahs.forEach(s => {
    s.ayahs.forEach(a => {
      const hizb = Math.ceil(a.hizbQuarter / 4);
      if (!map.has(hizb)) map.set(hizb, { hizb, start: { surah: s.number, ayah: a.numberInSurah }, end: null });
      map.get(hizb).end = { surah: s.number, ayah: a.numberInSurah };
    });
  });
  return Array.from(map.values()).sort((a, b) => a.hizb - b.hizb);
};
