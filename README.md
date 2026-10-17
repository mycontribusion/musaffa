# MusaffaPro

**MusaffaPro** is a modern Progressive Web Application (PWA) designed to be the ultimate companion for Quranic memorization (Hifz) and revision (Mudarasa). By simulating the traditional Mudarasa experience and providing advanced tools for mastering the most challenging aspects of Quranic memorization, it acts as a virtual recitation partner and a powerful study tool.

> **Deployed at:** https://musaffapro.vercel.app

## Key Features

### 🎙️ Interactive Mudarasa (Virtual Partner Session)
Revise specific portions of the Quran (e.g., a page, half a Hizb, or a specific Surah) with a virtual partner.
- **Turn-Based Recitation:** The app recites a portion, and then it is your turn.
- **Hands-Free Mode:** Uses advanced microphone sensitivity detection to listen for your voice. When you stop reciting, the app automatically triggers the next turn, allowing for a completely hands-free, continuous revision experience.
- **Eight Reciters:** Choose from renowned reciters including Mishary Alafasy, Mahmoud Al-Husary, Mohamed Al-Minshawi, Abdul Basit (Murattal), Ali Al-Huthaify, Sa'ud Ash-Shuraim, Maher Al-Muaiqly, and Saad Al-Ghamidi.

### 🧠 Mutashabihat Mastery Engine
Conquer the *Mutashabihat* (verses that are identical or highly similar to verses in other parts of the Quran).
- **Waqar114 Integration:** Features the highly regarded Waqar114 Mutashabihat dataset.
- **Dynamic Quizzes:** Context-aware quizzes test your ability to correctly identify and distinguish between similar verses, preventing common mix-ups.
- **Multi-Surah Sessions:** Run Mutashabihat drills across multiple Surahs in a single continuous session.

### 🎯 Smart Mode (Error Detection + Auto-Next)
An advanced session mode that actively listens while you recite:
- **Local Error Detection:** Spoken text is compared against the expected Quran text using an on-device worker (`@huggingface/transformers` + `onnxruntime-web`), flagging mismatches without cloud round-trips.
- **Auto-Next:** When you finish a portion the app advances automatically.
- **Stuck Detection:** If you pause too long, MusaffaPro prompts you with a visual hint and a retry option rather than leaving you hanging.

### 💾 Smart Tracking & Persistence
MusaffaPro remembers your progress so you don't have to.
- **Session Resume:** Interrupted mid-session? The app saves your exact state (chunk and turn). A smart banner allows you to instantly resume right where you left off.
- **The Stumble Bank:** Flag ayahs you struggle with during recitation to focus future revision on your weakest areas.
- **Last-Read Tracking:** Automatically smooth-scrolls to the exact Ayah you were last reading when returning to a Surah.
- **Presets:** Save and reload common session configurations for different revision goals.

### 🎨 Premium Aesthetic and Typography
- **Glassmorphism Design:** A stunning UI with glass-like components, subtle glows, and fluid animations.
- **Authentic Typography:** Uses the `Amiri Quran` font for complete and mathematically precise Unicode coverage of all specific Quranic glyphs (like Alef Wasla and Superscript Alef).
- **Dark & Light Modes:** Seamless theme switching to reduce eye strain.

### 📶 Offline Capability
- **PWA Ready:** Core assets, fonts, and Quran data are cached locally via Service Workers, so the Surah library, Mutashabihat drills, and reading work without an internet connection.
- **Audio Caching:** Recitation audio is cached on first play; repeat visits to the same ayahs work offline. (See the [offline requirements plan](plans/smart-mode-offline-requirements.md) for the work-in-progress path to fully offline Smart Mode audio.)

## Tech Stack

- **Framework:** React 19 + Vite 8
- **Routing:** React Router DOM
- **State Management:** Custom Hooks (`useMusaffa`, `useQuiz`, `useMic`, `useRecitationCheck`, `useSpeechRecognition`)
- **Animations:** Framer Motion
- **Speech-to-Text:** Web Speech API + onnxruntime-web error detection
- **Storage:** LocalStorage for lightweight persistence; Service Worker caches (Workbox) for PWA offline
- **Styling:** Vanilla CSS with custom properties (Variables)

## Local Development Setup

### Web (PWA)
To run MusaffaPro locally:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quran
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   > The microphone requires a secure context. If you reach the dev server over a LAN IP (plain HTTP), generate a self-signed cert first:
   > ```bash
   > npm run dev:cert
   > ```

4. **Build for production**
   ```bash
   npm run build
   ```

 ## License
[Add License Information Here]
