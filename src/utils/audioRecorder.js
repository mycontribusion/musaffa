/**
 * audioRecorder.js
 *
 * Captures microphone input and resamples to 16kHz Float32 PCM chunks
 * for feeding on-device offline ASR engines (Sherpa-ONNX / Whisper).
 */

export class AudioRecorder {
  constructor({ onAudioData, targetSampleRate = 16000 }) {
    this.onAudioData = onAudioData;
    this.targetSampleRate = targetSampleRate;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptNode = null;
    this.isRecording = false;
  }

  async start() {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: this.targetSampleRate });

      const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 4096 buffer size yields ~250ms chunks at 16kHz
      this.scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;
        const inputData = event.inputBuffer.getChannelData(0);
        // Create a copy of the Float32 PCM data chunk
        const pcmChunk = new Float32Array(inputData);
        if (this.onAudioData) {
          this.onAudioData(pcmChunk);
        }
      };

      sourceNode.connect(this.scriptNode);
      // BUG FIX (Bug #5): Do NOT connect scriptNode to destination.
      // Doing so routes live mic audio to the speaker, creating an audible
      // echo / feedback loop on Android and confusing Vosk's VAD.
      // For ASR-only capture the node just needs to be in the graph so that
      // onaudioprocess fires — it does not need to output any sound.
      // this.scriptNode.connect(this.audioContext.destination); // ← REMOVED

      this.isRecording = true;
    } catch (err) {
      console.warn('Failed to start AudioRecorder:', err);
      this.stop();
      throw err;
    }
  }

  stop() {
    this.isRecording = false;
    if (this.scriptNode) {
      try { this.scriptNode.disconnect(); } catch (_) {}
      this.scriptNode = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
  }
}
