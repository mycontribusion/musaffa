# Smart Musaffa: Mistake Detection Requirements

## Executive Summary

Transform the existing Musaffa (partner recitation) feature from a simple silence-detection turn-switcher into an intelligent recitation coach that can detect and categorize mistakes in real-time as the user recites Quranic verses.

---

## 1. Current Architecture Analysis

### Existing Components
| Component | Role | Gap |
|-----------|------|-----|
| [`useMusaffa`](src/hooks/useMusaffa.js) | Audio playback, chunk management, turn switching | No speech recognition or text comparison |
| [`MudarasaView`](src/components/MudarasaView.jsx) | UI for recitation session | Only shows volume/silence indicators |
| [`useMic`](src/hooks/useMic.js) | Volume monitoring, silence detection | No transcription capability |
| [`quranAr`](public/data/quran-ar.json) | Full Arabic Quran text | Available for comparison |
| [`stumbles`](src/App.jsx:21) | Manual mistake logging | Not automated |

### Integration Points
- **Hook layer**: [`useMusaffa`](src/hooks/useMusaffa.js) manages session state — ideal place to inject recognition logic
- **UI layer**: [`MudarasaView`](src/components/MudarasaView.jsx) renders ayah text — can overlay feedback
- **Data layer**: [`quranAr`](public/data/quran-ar.json) provides ground truth for comparison
- **State layer**: [`App.jsx`](src/App.jsx) already manages `stumbles` and session persistence

---

## 2. Speech Recognition Strategy

### Primary Approach: Web Speech API (Browser-Native)

**Why Web Speech API:**
- Zero additional dependencies or API keys
- Works offline in some browsers (Chrome caches models)
- Already available in modern browsers
- Free and unlimited usage

**Limitations:**
- Arabic support varies by browser/OS
- Chrome/Edge: Best Arabic support (uses Google's speech models)
- Safari: Limited Arabic support
- Firefox: No Web Speech API support
- Accuracy: ~85-90% for clear Arabic recitation ( Tajweed rules may confuse it)

**Implementation:**
```javascript
// New hook: useSpeechRecognition.js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'ar-SA';
```

### Fallback: Cloud Speech-to-Text (Optional Enhancement)

**When to use:**
- Browser doesn't support Web Speech API
- User wants higher accuracy
- Online connection available

**Options:**
- Google Cloud Speech-to-Text (best Arabic accuracy, ~$0.006/15s)
- Azure Speech Services (good Arabic, free tier available)
- Whisper API (OpenAI, excellent multilingual, ~$0.006/min)

**Recommendation:** Start with Web Speech API only. Add cloud fallback as Phase 2.

---

## 3. Arabic Text Comparison & Fuzzy Matching

### Challenge: Arabic Recitation Variations

Quranic recitation has legitimate variations that must NOT be flagged as mistakes:
- **Tajweed rules**: Madd (elongation), Ghunnah, Qalqalah
- **Dialect variations**: Hafs vs Warsh riwayat
- **Pronunciation differences**: Alif maqsura, taa marbuta
- **Word order**: Some ayahs have variant word orders in different qira'at

### Normalization Pipeline

```
Raw Speech → Normalize Arabic → Compare → Classify
```

**Step 1: Text Normalization**
```javascript
const normalizeArabic = (text) => {
  return text
    // Remove tatweel (kashida)
    .replace(/[ـ]/g, '')
    // Remove diacritics (harakat) for base comparison
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    // Normalize alef variants
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize taa marbuta to taa maftuha (optional, configurable)
    .replace(/ة/g, 'ه')
    // Normalize yeh variants
    .replace(/[ىٰ]/g, 'ي')
    // Remove sukun, shadda handling
    .replace(/ّ/g, '') // Remove shadda (doubling) for base comparison
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim();
};
```

**Step 2: Comparison Strategy**

| Method | Use Case | Implementation |
|--------|----------|----------------|
| **Exact match** | Perfect recitation | `normalize(spoken) === normalize(expected)` |
| **Levenshtein distance** | Minor pronunciation errors | Calculate edit distance, threshold-based |
| **Word-level comparison** | Identify which words are wrong | Split into words, compare individually |
| **Phonetic matching** | Similar-sounding words | Arabic phonetic alphabet mapping |

**Levenshtein Thresholds:**
- Perfect: 0 edits
- Excellent: 1-2 edits (acceptable for long ayahs)
- Good: 3-5 edits
- Needs improvement: 6+ edits

**Word-level Classification:**
```javascript
const classifyMistake = (spokenWords, expectedWords) => {
  const mistakes = [];
  const maxLen = Math.max(spokenWords.length, expectedWords.length);
  
  for (let i = 0; i < maxLen; i++) {
    const spoken = normalizeArabic(spokenWords[i] || '');
    const expected = normalizeArabic(expectedWords[i] || '');
    
    if (spoken !== expected) {
      const distance = levenshtein(spoken, expected);
      if (distance > 0) {
        mistakes.push({
          position: i,
          expected: expectedWords[i],
          spoken: spokenWords[i] || '(missing)',
          type: distance === 1 ? 'minor' : distance <= 3 ? 'moderate' : 'severe',
          severity: distance
        });
      }
    }
  }
  return mistakes;
};
```

---

## 4. Mistake Detection & Categorization

### Mistake Types

| Category | Description | Example | Severity |
|----------|-------------|---------|----------|
| **Omission (Sahw)** | Skipped a word or verse | Missed "الرحمن" | High |
| **Addition (Ziyadah)** | Added extra word | Said "الرحمن الرحيم" when only "الرحيم" | Medium |
| **Substitution (Badal)** | Wrong word | Said "الرحيم" instead of "الرحمن" | High |
| **Pronunciation (Lahn)** | Correct word, wrong pronunciation | "ق" pronounced as "ك" | Low-Medium |
| **Order (Badl)** | Words in wrong order | Swapped two words | Medium |
| **Missing Madd/Tajweed** | Incorrect elongation | Shortened a madd letter | Low |
| **Stuttering/Repetition** | Repeated a word | "الرحمن الرحمن" | Low |

### Detection Logic

```javascript
// In useMusaffa or new useRecitationChecker hook
const checkRecitation = (spokenText, expectedAyah) => {
  const normalizedSpoken = normalizeArabic(spokenText);
  const normalizedExpected = normalizeArabic(expectedAyah.text);
  
  // 1. Check for complete match
  if (normalizedSpoken === normalizedExpected) {
    return { status: 'perfect', mistakes: [] };
  }
  
  // 2. Word-level analysis
  const spokenWords = normalizedSpoken.split(' ');
  const expectedWords = normalizedExpected.split(' ');
  
  const mistakes = classifyMistake(spokenWords, expectedWords);
  
  // 3. Categorize overall performance
  const severeCount = mistakes.filter(m => m.type === 'severe').length;
  const moderateCount = mistakes.filter(m => m.type === 'moderate').length;
  
  let status = 'good';
  if (severeCount > 0) status = 'needs-work';
  else if (moderateCount > 2) status = 'fair';
  else if (mistakes.length === 0) status = 'perfect';
  else status = 'good';
  
  return { status, mistakes, score: calculateScore(mistakes, expectedWords.length) };
};

const calculateScore = (mistakes, totalWords) => {
  const penalty = mistakes.reduce((sum, m) => sum + m.severity * 10, 0);
  const maxPenalty = totalWords * 15;
  return Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
};
```

---

## 5. UI/UX Design for Real-Time Feedback

### Feedback Modes

| Mode | Description | When to Use |
|------|-------------|-------------|
| **Stealth** | No feedback during recitation, summary at end | Practice mode |
| **Gentle** | Subtle highlights, no interruptions | Learning mode |
| **Active** | Real-time word highlighting, gentle corrections | Improvement mode |
| **Strict** | Immediate feedback on every mistake | Hifz mode |

### UI Components

#### 5.1 Live Word Highlighting
```
During recitation, each word lights up as it's spoken correctly:
- Green: Correctly recited
- Yellow: Uncertain/partial match
- Red: Mistake detected
- Gray: Not yet reached
```

#### 5.2 Mistake Tooltip
```
On mistake, show a subtle tooltip:
"Expected: الرَّحْمَٰنِ | Heard: الرَّحِيمِ"
[Replay] [Skip] [Mark as correct (override)]
```

#### 5.3 End-of-Ayah Summary
```
After each ayah:
✓ 12/15 words correct
⚠ 2 pronunciation issues
✗ 1 word substitution

[Continue] [Review Mistakes] [Replay Ayah]
```

#### 5.4 Session Summary Screen
```
Session Complete - Surah Al-Fatiha

Overall Score: 87/100
Words Recited: 120/140
Accuracy: 85.7%

Mistakes Breakdown:
- Omissions: 2
- Substitutions: 1
- Pronunciation: 3

Words to Practice:
1. الرَّحْمَٰنِ (said: الرَّحِيمِ)
2. ...
3. ...

[Retry Problematic Ayat] [Save Progress] [New Session]
```

### Visual Design Specifications

```css
/* Word-level highlighting */
.ayah-word {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  border-radius: 0.3rem;
  transition: all 0.3s ease;
}
.ayah-word.correct { background: rgba(52, 211, 153, 0.15); color: #34d399; }
.ayah-word.incorrect { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.ayah-word.current { 
  background: rgba(212, 175, 55, 0.2); 
  border-bottom: 2px solid var(--accent-gold);
  animation: pulse 1.5s infinite;
}
.ayah-word.pending { color: var(--text-muted); opacity: 0.5; }
```

---

## 6. State Management Plan

### New State Structure

```javascript
// In useMusaffa or new useRecitationAnalysis hook
const [recitationState, setRecitationState] = useState({
  isListening: false,
  currentTranscript: '',
  interimTranscript: '',
  currentWordIndex: 0,
  ayahResults: [], // Per-ayah results
  sessionStats: {
    totalWords: 0,
    correctWords: 0,
    mistakes: [],
    startTime: null,
  },
  feedbackMode: 'gentle', // 'stealth' | 'gentle' | 'active' | 'strict'
  showMistakeDetails: false,
  selectedMistake: null,
});
```

### Persistence Strategy

| Data | Storage | Reason |
|------|---------|--------|
| Session results | `localStorage` | Resume later, track progress |
| Mistake patterns | `localStorage` | Identify weak spots |
| Audio recordings (optional) | IndexedDB | Review recitation |
| User preferences | `localStorage` | Feedback mode, sensitivity |

### Integration with Existing State

```javascript
// Extend existing stumbles tracking
const logMistake = (ayah, mistake) => {
  setStumbles(prev => {
    const existing = prev.find(s => s.number === ayah.number);
    if (existing) {
      // Update existing entry with new mistake data
      return prev.map(s => s.number === ayah.number 
        ? { ...s, mistakes: [...(s.mistakes || []), mistake], lastPracticed: new Date().toISOString() }
        : s
      );
    }
    return [...prev, { 
      ...ayah, 
      mistakes: [mistake],
      date: new Date().toISOString(),
      surahName: selectedSurah?.englishName 
    }];
  });
};
```

---

## 7. Offline/Online Fallback Strategies

### Capability Matrix

| Feature | Online | Offline |
|---------|--------|---------|
| Audio playback | Stream | Cached only |
| Speech recognition | Web Speech API / Cloud | Web Speech API (Chrome only) |
| Text comparison | Full | Full (local) |
| Mistake logging | Full | Full (localStorage) |
| Session persistence | Full | Full (localStorage) |

### Fallback Flow

```
Start Session
    ↓
Check: Browser supports Web Speech API?
    ↓ YES                    ↓ NO
Use Web Speech API    Check: Online?
    ↓                    ↓ YES          ↓ NO
Use Arabic model    Use Cloud API    Show message:
    ↓                    ↓          "Speech recognition
Proceed with         ↓          requires Chrome browser
smart musaffa    Use Cloud API      or internet connection"
                    ↓
                    Proceed with
                    smart musaffa
```

### Offline Graceful Degradation

1. **Full smart mode**: Chrome + Web Speech API + cached audio
2. **Partial smart mode**: Speech recognition works, no audio streaming
3. **Basic mode**: No speech recognition, manual "Finished" button only (current behavior)

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Basic speech recognition integration

- [ ] Create [`useSpeechRecognition.js`](src/hooks/useSpeechRecognition.js) hook
- [ ] Integrate Web Speech API with Arabic language setting
- [ ] Add interim and final transcript handling
- [ ] Create basic text normalization utilities
- [ ] Wire up to [`MudarasaView`](src/components/MudarasaView.jsx) for live transcript display
- [ ] Add browser capability detection

### Phase 2: Text Comparison (Week 2-3)
**Goal:** Accurate Arabic text matching

- [ ] Implement [`normalizeArabic()`](src/utils/arabicUtils.js) utility
- [ ] Add Levenshtein distance calculation for Arabic
- [ ] Build word-level comparison engine
- [ ] Create mistake classification logic
- [ ] Add tajweed-aware normalization options

### Phase 3: Mistake Detection (Week 3-4)
**Goal:** Categorize and score mistakes

- [ ] Define mistake type taxonomy
- [ ] Implement mistake detection algorithms
- [ ] Build scoring system
- [ ] Create mistake logging integration with existing `stumbles`
- [ ] Add per-ayah result tracking

### Phase 4: UI Feedback (Week 4-5)
**Goal:** Beautiful, intuitive feedback

- [ ] Design word-level highlighting component
- [ ] Build mistake tooltip/popover
- [ ] Create end-of-ayah summary modal
- [ ] Design session summary screen
- [ ] Add feedback mode selector (stealth/gentle/active/strict)
- [ ] Implement animations and transitions

### Phase 5: Polish & Testing (Week 5-6)
**Goal:** Production-ready experience

- [ ] Test with native Arabic speakers
- [ ] Test across browsers (Chrome, Safari, Firefox)
- [ ] Optimize performance (debounce, memoization)
- [ ] Add accessibility features (screen reader support)
- [ ] Create onboarding/tutorial for new feature
- [ ] Add settings page for recognition preferences

### Phase 6: Advanced Features (Week 6+)
**Goal:** Differentiators

- [ ] Cloud speech fallback integration
- [ ] Audio recording of user recitation for review
- [ ] Progress tracking over time (graphs, streaks)
- [ ] Weak ayah identification and targeted practice
- [ ] Social features (share progress, compete with friends)
- [ ] Hifz mode with spaced repetition

---

## 9. Technical Considerations

### Performance
- Debounce transcript processing (300ms)
- Use `requestAnimationFrame` for UI updates
- Memoize normalized ayah text
- Virtualize long ayah lists if needed

### Privacy
- Speech data processed locally (Web Speech API)
- No audio recordings sent to servers (unless cloud fallback enabled)
- Clear privacy policy for cloud features
- Option to disable recognition entirely

### Accessibility
- Keyboard navigation for feedback controls
- Screen reader announcements for mistakes
- High contrast mode support
- Reduced motion option

### Browser Support
| Browser | Speech API | Arabic Support | Recommendation |
|---------|-----------|----------------|----------------|
| Chrome | ✅ | ✅ Excellent | Primary target |
| Edge | ✅ | ✅ Excellent | Primary target |
| Safari | ⚠️ Partial | ⚠️ Limited | Basic mode fallback |
| Firefox | ❌ | ❌ | Basic mode fallback |
| iOS Safari | ⚠️ | ⚠️ | Basic mode fallback |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Detection accuracy | >85% | User feedback + manual review |
| False positive rate | <10% | User overrides |
| Session completion rate | >70% | Analytics |
| User satisfaction | >4/5 | In-app survey |
| Browser compatibility | 90% of users | Browser stats |

---

## 11. Open Questions

1. **Riwayat support**: Should users select Hafs/Warsh/etc for comparison?
2. **Tajweed strictness**: Should tajweed errors be flagged or ignored?
3. **Cloud fallback**: Is there budget for Google/Azure/Whisper API costs?
4. **Audio recording**: Should we record and store user recitation?
5. **Social features**: Should users share progress or compete?

---

## 12. Dependencies to Add

```json
{
  "dependencies": {
    // No new dependencies for Phase 1-3 (Web Speech API is native)
    // Phase 6 options:
    "@google-cloud/speech": "^6.0.0",  // Cloud fallback
    "levenshtein": "^1.0.5",           // If not implementing custom
    "wavesurfer.js": "^7.0.0"          // Audio visualization (optional)
  }
}
```

---

*Document Version: 1.0*
*Last Updated: 2026-06-07*
