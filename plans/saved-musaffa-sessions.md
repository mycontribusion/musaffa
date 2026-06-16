# Saved Musaffa Sessions Feature

## Overview
Allow users to save up to 5 Musaffa session configurations (presets) so they don't have to reconfigure the session every time.

## Current State Analysis

### What's Already Saved
- **Single active session**: `savedMusaffaSession` in `localStorage` (key: `quran_musaffa_session`)
- Contains: `params`, `chunkIndex`, `turn`, `surahNumber`, `savedAt`
- Used for **pause & resume** functionality only
- Shows a "Resume Session" banner in SurahList

### What Needs to Change
- Convert from single session to **array of saved presets** (max 5)
- Add ability to **save named presets** from the config screen
- Add ability to **load presets** to quickly start a session
- Keep the existing pause/resume functionality separate from presets

## Implementation Plan

### 1. Data Structure Changes

```javascript
// New localStorage key: 'quran_musaffa_presets'
// Array of preset objects:
[
  {
    id: 'uuid',           // Unique identifier
    name: 'My Juz 1',     // User-friendly name
    params: {             // musaffaParams
      startSurah: 1,
      startAyah: 1,
      endSurah: 2,
      endAyah: 286,
      portion: 'page',
      whoStarts: 'app',
      autoNext: false,
      micSensitivity: 15,
      errorDetection: false
    },
    reciter: 'ar.alafasy', // Reciter preference
    createdAt: 'ISO date',
    lastUsed: 'ISO date'   // For sorting
  }
]
```

### 2. App.jsx Changes

- Replace `savedMusaffaSession` state with `savedMusaffaPresets` (array)
- Add `saveMusaffaPreset(name)` function - saves current params as a preset
- Add `loadMusaffaPreset(presetId)` function - loads preset and starts session
- Add `deleteMusaffaPreset(presetId)` function - removes a preset
- Add `clearMusaffaSession()` - keeps existing for active session (separate from presets)
- Add localStorage persistence for presets array

### 3. SurahList.jsx Changes

- Display saved presets in a horizontal scroll section (similar to "Recent Reads")
- Each preset shows: name, surah range, portion type
- "Start" button to load and begin the session
- "Delete" (×) button to remove preset

### 4. PartnerConfig.jsx Changes

- Add "Save Preset" button at the bottom
- Modal or input to name the preset
- Show list of existing presets with "Load" buttons
- Presets section below the "Who Starts" section

## User Flow

```
mermaid
flowchart TD
    A[Surah List] --> B{Start Musaffa}
    B -->|Quick Start| C[Partner Config]
    C --> D[Configure Session]
    D --> E[Save as Preset]
    E --> F[Name Preset]
    F --> G[Preset Saved]
    
    B -->|From Preset| H[Select Saved Preset]
    H --> I[Load Configuration]
    I --> C
    
    A -->|View Presets| J[Preset List]
    J -->|Click Start| H
```

## Technical Details

### Storage Keys
- `quran_musaffa_presets` - Array of saved presets
- `quran_musaffa_session` - Active session (for pause/resume) - keep as-is

### Functions to Add in App.jsx

```javascript
// Save current configuration as a preset
const saveMusaffaPreset = useCallback((name) => {
  const newPreset = {
    id: Date.now().toString(),
    name: name || `Session ${savedMusaffaPresets.length + 1}`,
    params: musaffaParams,
    reciter: reciter,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  };
  const updated = [newPreset, ...savedMusaffaPresets].slice(0, 5);
  setSavedMusaffaPresets(updated);
}, [musaffaParams, reciter, savedMusaffaPresets]);

// Load a preset and start session
const loadMusaffaPreset = useCallback((preset) => {
  setMusaffaParams(preset.params);
  setReciter(preset.reciter);
  setView('partner');
  setPartnerSubView('config');
  // Update lastUsed
  setSavedMusaffaPresets(prev => 
    prev.map(p => p.id === preset.id ? {...p, lastUsed: new Date().toISOString()} : p)
  );
}, []);
```

## Questions for Clarification

1. Should presets include the `reciter` setting, or should that be separate?
2. Should we allow editing preset names after creation?
3. Should presets be sorted by `lastUsed` or `createdAt`?
4. Do you want a "Save current session as preset" option during an active session?