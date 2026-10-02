import { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { VoskSpeechRecognition } from '../platform/voskPlugin';

/**
 * Hook to manage Vosk speech recognition model.
 * The model is bundled inside the APK/AAB and is installed on first use.
 */
export const useVoskModelDownload = () => {
  const isNative = Capacitor.isNativePlatform();
  const [modelStatus, setModelStatus] = useState('idle'); // idle | installing | ready | error
  const [installProgress, setInstallProgress] = useState(0);
  const [installMessage, setInstallMessage] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // ── FIX (Bug #1): Keep a ref that always mirrors modelStatus.
  // React useState values captured inside useCallback closures are frozen at
  // the time the callback is created. The setInterval inside downloadAndInitModel
  // would read a stale 'idle'/'installing' value and never resolve the Promise.
  // The ref is updated in the same synchronous tick as the state setter, so it
  // is always current even inside interval/timeout callbacks.
  const modelStatusRef = useRef('idle');
  const setModelStatusSafe = useCallback((status) => {
    modelStatusRef.current = status;
    setModelStatus(status);
  }, []);

  const installStartListenerRef = useRef(null);
  const installCompleteListenerRef = useRef(null);
  const installErrorListenerRef = useRef(null);

  // Setup Vosk listeners for native Android
  useEffect(() => {
    if (!isNative) return;

    let isMounted = true;
    const setupListeners = async () => {
      try {
        const startListener = await VoskSpeechRecognition.addListener('downloadStart', (data) => {
          if (!isMounted) return;
          setModelStatusSafe('installing'); // use safe setter to keep ref in sync
          setInstallMessage(data.message || 'Installing speech recognition model...');
        });
        installStartListenerRef.current = startListener;

        const completeListener = await VoskSpeechRecognition.addListener('downloadComplete', (data) => {
          if (!isMounted) return;
          setModelStatusSafe('ready'); // ref updated → any pending interval will now resolve
          setInstallProgress(100);
          setInstallMessage(data.message || 'Model ready');
          setShowInstallPrompt(false);
        });
        installCompleteListenerRef.current = completeListener;

        const errorListener = await VoskSpeechRecognition.addListener('downloadError', (data) => {
          if (!isMounted) return;
          setModelStatusSafe('error');
          setInstallMessage(data.error || 'Installation failed');
          setShowInstallPrompt(false);
        });
        installErrorListenerRef.current = errorListener;
      } catch (err) {
        console.warn('[VoskModelDownload] Listener setup error:', err);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      if (installStartListenerRef.current) {
        try { installStartListenerRef.current.remove(); } catch { /* ignore */ }
      }
      if (installCompleteListenerRef.current) {
        try { installCompleteListenerRef.current.remove(); } catch { /* ignore */ }
      }
      if (installErrorListenerRef.current) {
        try { installErrorListenerRef.current.remove(); } catch { /* ignore */ }
      }
    };
  }, [isNative]);

  // Check if model is available on mount (deferred to avoid blocking main thread during startup)
  useEffect(() => {
    if (!isNative) return;

    const timeoutId = setTimeout(() => {
      const checkModel = async () => {
        try {
          const result = await VoskSpeechRecognition.initialize({ language: 'ar' });
          if (result.status === 'initialized') {
            setModelStatusSafe('ready');
          } else if (result.status === 'error') {
            setModelStatusSafe('error');
            setInstallMessage(result.message || 'Model initialization failed');
          } else {
            // Model needs to be installed from bundled assets
            setModelStatusSafe('needs_install');
          }
        } catch (err) {
          console.error('[VoskModelDownload] initialize error:', err);
          setModelStatusSafe('error');
        }
      };

      checkModel();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isNative, setModelStatusSafe]);

  const confirmInstall = useCallback(async () => {
    setShowInstallPrompt(false);
    setModelStatusSafe('installing');
    setInstallProgress(0);
    setInstallMessage('Installing model...');

    try {
      await VoskSpeechRecognition.downloadModel();
    } catch (err) {
      console.error('[VoskModelDownload] install error:', err);
      setModelStatusSafe('error');
      setInstallMessage('Installation failed: ' + err.message);
    }
  }, [setModelStatusSafe]);

  /**
   * Ensures the Vosk model is ready and returns a promise that resolves
   * when modelStatus becomes 'ready'. Handles all states:
   * - 'ready': resolves immediately
   * - 'installing': waits for downloadComplete event
   * - 'needs_install': triggers confirmInstall() then waits
   * - 'error': retries installation then waits
   */
  const downloadAndInitModel = useCallback(async () => {
    // ── FIX (Bug #1): Read from ref, not stale closure state.
    // modelStatusRef.current is always the live value regardless of when
    // this callback was last re-created by React.
    if (modelStatusRef.current === 'ready') return;

    // Helper: returns a Promise that resolves when ref reaches 'ready'
    // or rejects on 'error' / timeout. Safe because it polls the ref.
    const waitForReady = () => new Promise((resolve, reject) => {
      const cleanup = () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Model installation timed out'));
      }, 120000);
      const checkInterval = setInterval(() => {
        // ← Always reads the live ref value, never a stale closure
        if (modelStatusRef.current === 'ready') {
          cleanup(); resolve();
        } else if (modelStatusRef.current === 'error') {
          cleanup(); reject(new Error('Model installation failed'));
        }
      }, 300);
    });

    // If already installing, just wait for it to finish
    if (modelStatusRef.current === 'installing') {
      return waitForReady();
    }

    // If model needs install or errored, trigger installation then wait
    if (modelStatusRef.current === 'needs_install' || modelStatusRef.current === 'error') {
      await confirmInstall();
    }

    return waitForReady();
  }, [confirmInstall]); // modelStatus removed — we read from ref directly

  return {
    modelStatus,
    installProgress,
    installMessage,
    showInstallPrompt,
    confirmInstall,
    downloadAndInitModel,
    setShowInstallPrompt,
    isNative,
  };
};
