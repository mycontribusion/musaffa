import { useState, useEffect } from 'react';

export function MicStatusIndicator({ children, isOnline }) {
  const [isOnlineState, setIsOnlineState] = useState(isOnline ?? navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const online = isOnline ?? isOnlineState;

  return (
    <div className="relative inline-flex items-center">
      {children}
      {!online && (
        <span 
          title="Speech recognition requires an internet connection"
          className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow"
        >
          !
        </span>
      )}
    </div>
  );
}
