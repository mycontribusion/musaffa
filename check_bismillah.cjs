const fs = require('fs');
const quranAr = JSON.parse(fs.readFileSync('/home/kali/Documents/DeenTech/quran/public/data/quran-ar.json', 'utf8'));
const quranEn = JSON.parse(fs.readFileSync('/home/kali/Documents/DeenTech/quran/public/data/quran-en.json', 'utf8'));

console.log("Arabic Baqarah 1:", quranAr.data.surahs[1].ayahs[0].text);
console.log("English Baqarah 1:", quranEn.data.surahs[1].ayahs[0].text);
console.log("Arabic Maryam 1:", quranAr.data.surahs[18].ayahs[0].text);
console.log("English Maryam 1:", quranEn.data.surahs[18].ayahs[0].text);

