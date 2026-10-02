/**
 * voskPlugin.js — single platform boundary for the Vosk offline STT plugin.
 *
 * ── Why this module exists ────────────────────────────────────────────────
 * `@deentech/vosk-speech-recognition` is a *local Capacitor plugin* whose
 * source lives in the git-ignored `android/` directory (see .gitignore).
 * `npm install` therefore creates a **dangling symlink** in environments that
 * don't have `android/` (CI, Vercel), and any static `import` of the package
 * makes the Vite/Rolldown web build fail with:
 *
 *   [vite]: Rolldown failed to resolve import "@deentech/vosk-speech-recognition"
 *
 * This module removes that failure mode entirely by binding to the plugin
 * **by name** through `@capacitor/core`, which is a real published dependency
 * and always resolves.
 *
 * ── Platform behaviour ────────────────────────────────────────────────────
 * Android / Capacitor:
 *   `registerPlugin()` returns a proxy that dispatches over the Capacitor
 *   native bridge. The bridge resolves the name to the Java implementation
 *   using `android/app/src/main/assets/capacitor.plugins.json`
 *   (pkg `@deentech/vosk-speech-recognition` →
 *    class `com.deentech.vosk.speech.VoskSpeechRecognition`).
 *   So offline Vosk recognition and the model download/install flow are
 *   completely unchanged. The package is still declared in package.json so
 *   `npx cap sync` still discovers and registers the native module.
 *
 * Web / PWA:
 *   The `web` loader below supplies an inert stub. The stub is only ever
 *   touched when `Capacitor.isNativePlatform()` is false, and the hooks in
 *   this app already gate all Vosk calls behind that check. The browser
 *   continues to use the Web Speech API path in `useSpeechRecognition`.
 *
 * The Android-only package is never imported here, so the web bundle can
 * never try to resolve it.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Inert web implementation. Mirrors the no-op behaviour of the plugin's own
 * `web.ts`, so a stray call can never throw in the browser.
 */
const createWebStub = () => {
  const noopAsync = async () => {};
  return {
    initialize: async () => ({ status: 'unsupported' }),
    downloadModel: async () => ({ status: 'unsupported' }),
    isModelAvailable: async () => ({ available: false }),
    startListening: noopAsync,
    stopListening: noopAsync,
    cancel: noopAsync,
    isListening: async () => ({ listening: false }),
    addListener: async () => ({ remove: noopAsync }),
    removeAllListeners: noopAsync,
  };
};

/**
 * The Vosk plugin handle.
 *
 * On native this is the real offline Vosk implementation; on web it is a
 * harmless stub. Use `isVoskAvailable()` before calling into it.
 */
export const VoskSpeechRecognition = registerPlugin('VoskSpeechRecognition', {
  web: () => createWebStub(),
});

/** True only on Android/iOS where the native Vosk plugin is registered. */
export const isVoskAvailable = () => Capacitor.isNativePlatform();

export default VoskSpeechRecognition;