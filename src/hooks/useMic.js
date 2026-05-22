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
        analyserRef.current.fftSize = 2048;

        const bufferLength = analyserRef.current.fftSize;
        const dataArray = new Float32Array(bufferLength);
        let silenceStart = null;
        const SILENCE_DURATION = 3500;

        const checkVolume = () => {
          // Float32 time-domain data: values range from -1.0 to 1.0
          analyserRef.current.getFloatTimeDomainData(dataArray);
          let peak = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = Math.abs(dataArray[i]);
            if (val > peak) peak = val;
          }
          // Apply software gain so normal speech (peak ~0.05-0.2) maps to 30-100
          const GAIN = 6;
          const volume = Math.min(100, peak * GAIN * 100);
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
