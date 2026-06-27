import fs from 'fs';
const quran = JSON.parse(fs.readFileSync('./src/data/quran_ar.json'));
const surah = quran.surahs[77]; // An-Naba is 78, so index 77
console.log(surah.ayahs[3]); // Verse 4
console.log(surah.ayahs[4]); // Verse 5
