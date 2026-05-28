# MusaffaPro

**MusaffaPro** is a modern Progressive Web Application (PWA) designed to be the ultimate companion for Quranic memorization (Hifz) and revision (Mudarasa). By simulating the traditional Mudarasa experience and providing advanced tools for mastering the most challenging aspects of Quranic memorization, it acts as a virtual recitation partner and a powerful study tool.

## Key Features

### 🎙️ Interactive Mudarasa (Virtual Partner Session)
Revise specific portions of the Quran (e.g., a page, half a Hizb, or a specific Surah) with a virtual partner.
- **Turn-Based Recitation:** The app recites a portion, and then it is your turn.
- **Hands-Free Mode:** Uses advanced microphone sensitivity detection to listen for your voice. When you stop reciting, the app automatically triggers the next turn, allowing for a completely hands-free, continuous revision experience.
- **World-Class Reciters:** Choose from renowned reciters like Mishary Alafasy, Mahmoud Al-Husary, and Mohamed Al-Minshawi.

### 🧠 Mutashabihat Mastery Engine
Conquer the *Mutashabihat* (verses that are identical or highly similar to verses in other parts of the Quran).
- **Waqar114 Integration:** Features the highly regarded Waqar114 Mutashabihat dataset.
- **Dynamic Quizzes:** Context-aware quizzes test your ability to correctly identify and distinguish between similar verses, preventing common mix-ups.

### 💾 Smart Tracking & Persistence
MusaffaPro remembers your progress so you don't have to.
- **Session Resume:** Interrupted mid-session? The app saves your exact state (chunk and turn). A smart banner allows you to instantly resume right where you left off.
- **The Stumble Bank:** Flag ayahs you struggle with during recitation to focus future revision on your weakest areas.
- **Last-Read Tracking:** Automatically smooth-scrolls to the exact Ayah you were last reading when returning to a Surah.

### 🎨 Premium Aesthetic and Typography
- **Glassmorphism Design:** A stunning UI with glass-like components, subtle glows, and fluid animations.
- **Authentic Typography:** Uses the `Amiri Quran` font for complete and mathematically precise Unicode coverage of all specific Quranic glyphs (like Alef Wasla and Superscript Alef).
- **Dark & Light Modes:** Seamless theme switching to reduce eye strain.

### 📶 True Offline Capability
- **PWA Ready:** Core assets, fonts, and data are cached locally via Service Workers.
- **Offline Reliability:** Access the Surah library, review Mutashabihat, and read the Quran without an active internet connection.

## Tech Stack

- **Framework:** React + Vite
- **State Management:** Custom Hooks (`useMusaffa`, `useQuiz`, `useMic`)
- **Animations:** Framer Motion
- **Storage:** LocalStorage for lightweight persistence
- **Styling:** Vanilla CSS with custom properties (Variables)

## Local Development Setup

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

4. **Build for production**
   ```bash
   npm run build
   ```

## License
[Add License Information Here]
