import { groupMutashabihatBySurah, buildSessionCards } from './src/utils/mutashabihatParser.js';
import fs from 'fs';

const waqar = fs.readFileSync('./public/data/waqar114', 'utf8');
const parsed = groupMutashabihatBySurah(waqar.split('\n').filter(l => l.trim()));
const quranAr = JSON.parse(fs.readFileSync('./public/data/quran-ar.json')).data;
const surahs = JSON.parse(fs.readFileSync('./public/data/surahs.json')).data;

const cards = buildSessionCards(parsed[76], 76, quranAr, surahs);
console.log(JSON.stringify(cards.map(c => c.id + ': context=' + c.contextVerse.surah + ':' + c.contextVerse.ayah + ' opts=' + c.options.map(o => o.surah + ':' + o.ayah).join(',')), null, 2));
