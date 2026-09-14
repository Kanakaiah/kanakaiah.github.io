import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        // Log silently - wake lock might be denied by battery saver or policy
        console.warn(`WakeLock Error: ${err.name}, ${err.message}`);
      }
    };

    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release().catch(() => {}).finally(() => {
          wakeLockRef.current = null;
        });
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
