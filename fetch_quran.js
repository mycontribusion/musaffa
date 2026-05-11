import fs from 'fs';
import path from 'path';

const DATA_DIR = './public/data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchQuran() {
  console.log('Fetching Quran data...');
  try {
    // Fetch Surah list
    const surahListRes = await fetch('https://api.alquran.cloud/v1/surah');
    const surahListData = await surahListRes.json();
    fs.writeFileSync(path.join(DATA_DIR, 'surahs.json'), JSON.stringify(surahListData.data, null, 2));
    console.log('Surah list saved.');

    // Fetch complete Quran (Arabic)
    const quranArabicRes = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
    const quranArabicData = await quranArabicRes.json();
    fs.writeFileSync(path.join(DATA_DIR, 'quran-ar.json'), JSON.stringify(quranArabicData.data, null, 2));
    console.log('Arabic Quran saved.');

    // Fetch complete Quran (English translation - Saheeh International)
    const quranEnglishRes = await fetch('https://api.alquran.cloud/v1/quran/en.sahih');
    const quranEnglishData = await quranEnglishRes.json();
    fs.writeFileSync(path.join(DATA_DIR, 'quran-en.json'), JSON.stringify(quranEnglishData.data, null, 2));
    console.log('English translation saved.');

    console.log('All Quran data fetched successfully.');
  } catch (error) {
    console.error('Error fetching Quran data:', error);
  }
}

fetchQuran();
