const fs = require('fs');
const quran = JSON.parse(fs.readFileSync('/home/kali/Documents/DeenTech/quran/public/data/quranAr.json', 'utf8'));

// Surah 19 (Maryam), Ayah 1
const maryam1 = quran.data.surahs[18].ayahs[0].text;
console.log("Original text:", maryam1);

function removeTashkeel(text) {
  return text.replace(/[\u064B-\u065F]/g, "");
}

function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0640/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[،؛؟!.,:;'"()[\]{}]/g, '')
    .replace(/(.)\1{3,}/g, '$1$1')
    .trim();
}

const MUQATTAAT_EXPANSIONS = {
  'الم':    'الف لام ميم',
  'الر':    'الف لام را',
  'المر':   'الف لام ميم را',
  'المص':   'الف لام ميم صاد',
  'كهيعص':  'كاف ها يا عين صاد',
  'طه':     'طا ها',
  'طسم':    'طا سين ميم',
  'طس':     'طا سين',
  'يس':     'يا سين',
  'ص':      'صاد',
  'حم':     'حا ميم',
  'حمعسق':  'حا ميم عين سين قاف',
  'ق':      'قاف',
  'ن':      'نون',
};

const expandMuqattaat = (text) => {
  if (!text) return text;
  let result = text;
  const sortedKeys = Object.keys(MUQATTAAT_EXPANSIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const regex = new RegExp(`(^|\\s)${key}(\\s|$)`, 'g');
    result = result.replace(regex, `$1${MUQATTAAT_EXPANSIONS[key]}$2`);
  }
  return result;
};

const clean = removeTashkeel(maryam1);
const norm = normalizeArabic(clean);
const exp = expandMuqattaat(norm);
console.log("Cleaned:", clean);
console.log("Normalized:", norm);
console.log("Expanded:", exp);

// Hex dump of normalized
for (let i=0; i<norm.length; i++) {
  console.log(norm[i], norm.charCodeAt(i).toString(16));
}

