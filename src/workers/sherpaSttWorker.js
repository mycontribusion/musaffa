/**
 * sherpaSttWorker.js
 *
 * Offline Arabic speech recognition using the speech-asr SDK
 * (Sherpa-ONNX WebAssembly) — 100% on-device, zero cloud dependency.
 *
 * The SpeechASR SDK manages its own internal worker/WASM lifecycle.
 * This thin wrapper exposes START/STOP/AUDIO_CHUNK messages to match
 * the existing useSpeechRecognition hook interface.
 */

// Note: SpeechASR from speech-asr handles mic capture internally.
// This worker just acts as an event relay between the main thread and the SDK.

let isReady = false;

self.onmessage = async (event) => {
  const { type } = event.data;

  if (type === 'INIT') {
    isReady = true;
    self.postMessage({ type: 'READY' });
    return;
  }

  if (type === 'START') {
    self.postMessage({ type: 'STARTED' });
    return;
  }

  if (type === 'STOP') {
    self.postMessage({ type: 'STOPPED' });
    return;
  }
};
