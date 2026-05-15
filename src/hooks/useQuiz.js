import { useState, useEffect } from 'react';
import { getAyahByGlobal, getAyahTextByGlobal, removeTashkeel } from '../utils/quranUtils';

export const useQuiz = (mutashabihatData, quranAr, surahs, selectedSurah) => {
  const [reciprocalData, setReciprocalData] = useState(null);
  const [dynamicMutashabihat, setDynamicMutashabihat] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState(null);

  // Reciprocity Engine
  useEffect(() => {
    if (!mutashabihatData || !quranAr) return;
    const expanded = { ...mutashabihatData };
    
    Object.keys(mutashabihatData).forEach(sKey => {
      mutashabihatData[sKey].forEach(entry => {
        entry.muts.forEach(m => {
          const mutInfo = getAyahByGlobal(m.ayah, quranAr, surahs);
          const srcInfo = getAyahByGlobal(entry.src.ayah, quranAr, surahs);
          
          if (mutInfo && srcInfo) {
            const mutSurahKey = (mutInfo.surahNumber - 1).toString();
            if (!expanded[mutSurahKey]) expanded[mutSurahKey] = [];
            const alreadyExists = expanded[mutSurahKey].some(e => JSON.stringify(e.src.ayah) === JSON.stringify(m.ayah));
            if (!alreadyExists) {
              expanded[mutSurahKey].push({ src: { ayah: m.ayah }, muts: [{ ayah: entry.src.ayah }], ctx: entry.ctx });
            }
          }
        });
      });
    });
    setReciprocalData(expanded);
  }, [mutashabihatData, quranAr, surahs]);

  const generateDynamicQuiz = () => {
    if (!selectedSurah || !quranAr || !reciprocalData) return [];
    const questions = [];
    const surahKey = (selectedSurah.number - 1).toString();
    const surahEntries = reciprocalData[surahKey] || [];
    
    surahEntries.forEach((entry, idx) => {
      const srcText = getAyahTextByGlobal(entry.src.ayah, quranAr);
      const allVersesInTrap = [
        { ayah: entry.src.ayah, info: getAyahByGlobal(entry.src.ayah, quranAr, surahs), text: srcText },
        ...entry.muts.map(m => ({ ayah: m.ayah, info: getAyahByGlobal(m.ayah, quranAr, surahs), text: getAyahTextByGlobal(m.ayah, quranAr) }))
      ];

      const versesInThisSurah = allVersesInTrap.filter(v => v.info?.surahNumber === selectedSurah.number);
      if (versesInThisSurah.length > 1) {
        const prevAyahGlobal = Array.isArray(entry.src.ayah) ? entry.src.ayah[0] - 1 : entry.src.ayah - 1;
        const prevAyah = getAyahByGlobal(prevAyahGlobal, quranAr, surahs);
        if (prevAyah && prevAyah.surahNumber === selectedSurah.number) {
          questions.push({
            id: `waqar-seq-${idx}`, type: 'sequence',
            question: `You are reciting Surah ${selectedSurah.englishName}. Which verse correctly follows this context?`,
            contextVerse: prevAyah.text,
            options: allVersesInTrap.map(v => ({ 
              text: v.text, 
              surahName: v.info?.surahName || "Other", 
              isCorrect: JSON.stringify(v.ayah) === JSON.stringify(entry.src.ayah),
              globalId: Array.isArray(v.ayah) ? v.ayah[0] : v.ayah
            })).sort(() => 0.5 - Math.random()),
            correctText: srcText,
            explanation: `Internal Mastery: This specific sequence identifies this verse in ${selectedSurah.englishName}.`
          });
        }
      } else {
        questions.push({
          id: `waqar-id-${idx}`, type: 'identify',
          question: `While reciting Surah ${selectedSurah.englishName}, which of these is the correct verse?`,
          options: allVersesInTrap.map(v => ({ 
            text: v.text, 
            surahName: v.info?.surahName || "Other", 
            isCorrect: JSON.stringify(v.ayah) === JSON.stringify(entry.src.ayah),
            globalId: Array.isArray(v.ayah) ? v.ayah[0] : v.ayah
          })).sort(() => 0.5 - Math.random()),
          correctText: srcText,
          explanation: `Identification Mastery: Among these documented similarities, only this phrasing belongs to ${selectedSurah.englishName}.`
        });
      }
    });
    return questions.sort(() => 0.5 - Math.random());
  };

  const handleQuizAnswer = (answer, onComplete) => {
    if (quizFeedback) return;
    const isCorrect = answer.text === dynamicMutashabihat[currentQuizIndex].correctText;
    setQuizFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setQuizScore(prev => prev + 1);
    setTimeout(() => {
      setQuizFeedback(null);
      if (currentQuizIndex < dynamicMutashabihat.length - 1) setCurrentQuizIndex(prev => prev + 1);
      else onComplete();
    }, 2000);
  };

  return {
    dynamicMutashabihat, setDynamicMutashabihat,
    currentQuizIndex, setCurrentQuizIndex,
    quizScore, setQuizScore,
    quizFeedback, setQuizFeedback,
    generateDynamicQuiz, handleQuizAnswer
  };
};
