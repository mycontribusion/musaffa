import { useState, useEffect, useRef } from 'react';

export const useMic = (isActive, sensitivity, onSilence) => {
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  // Use refs to avoid restarting the microphone stream when these change
  const onSilenceRef = useRef(onSilence);
  const sensitivityRef = useRef(sensitivity);

  useEffect(() => {
    onSilenceRef.current = onSilence;
    sensitivityRef.current = sensitivity;
  }, [onSilence, sensitivity]);

  useEffect(() => {
    let stream = null;
    let animationFrame = null;

    const startMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false
          } 
        });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let silenceStart = null;
        const SILENCE_DURATION = 3500;

        const checkVolume = () => {
          analyserRef.current.getByteTimeDomainData(dataArray);
          let peak = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = Math.abs(dataArray[i] - 128);
            if (val > peak) peak = val;
          }
          // peak maxes at 128. Convert to 0-100 scale.
          const volume = (peak / 128) * 100;
          setCurrentVolume(volume);

          if (onSilenceRef.current) {
            if (volume < sensitivityRef.current) {
              if (!silenceStart) silenceStart = Date.now();
              else if (Date.now() - silenceStart > SILENCE_DURATION) {
                onSilenceRef.current();
                silenceStart = null;
              }
            } else { silenceStart = null; }
          } else {
            silenceStart = null;
          }
          animationFrame = requestAnimationFrame(checkVolume);
        };

        setIsListening(true);
        checkVolume();
      } catch (err) { setIsListening(false); }
    };

    if (isActive) startMic();
    else { setIsListening(false); setCurrentVolume(0); }

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isActive]); // Only restart if isActive changes

  return { currentVolume, isListening };
};
