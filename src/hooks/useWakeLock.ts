import { useCallback, useEffect, useRef, useState } from 'react';

const IMMERSE_AWAKE_KEY = 'remora_immerse_keep_awake';
const IMMERSE_AWAKE_EVENT = 'remora:immerse-awake-change';

function readKeepImmerseAwake(): boolean {
  try {
    const raw = window.localStorage.getItem(IMMERSE_AWAKE_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

/**
 * Shared enabled-by-default preference for keeping the screen awake while Immerse is visible.
 */
export function useKeepImmerseAwake(): [boolean, (enabled: boolean) => void] {
  const [awake, setAwakeState] = useState<boolean>(readKeepImmerseAwake);

  useEffect(() => {
    const sync = () => setAwakeState(readKeepImmerseAwake());
    window.addEventListener(IMMERSE_AWAKE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(IMMERSE_AWAKE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setAwake = useCallback((enabled: boolean) => {
    setAwakeState(enabled);
    try {
      window.localStorage.setItem(IMMERSE_AWAKE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore storage quota or private-mode errors.
    }
    window.dispatchEvent(new Event(IMMERSE_AWAKE_EVENT));
  }, []);

  return [awake, setAwake];
}

export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const releaseWakeLock = () => {
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release().catch(() => {}).finally(() => {
          wakeLockRef.current = null;
        });
      }
    };

    const requestWakeLock = async () => {
      if (!enabled || cancelled) return;
      try {
        if ('wakeLock' in navigator && navigator.wakeLock) {
          const sentinel = await navigator.wakeLock.request('screen');
          if (cancelled || !enabled) {
            sentinel.release().catch(() => {});
            return;
          }
          wakeLockRef.current = sentinel;
        }
      } catch (err: unknown) {
        // Log silently - wake lock might be denied by battery saver or policy
        if (err instanceof Error) {
          console.warn(`WakeLock Error: ${err.name}, ${err.message}`);
        }
      }
    };

    if (!enabled) {
      releaseWakeLock();
      return () => {
        cancelled = true;
      };
    }

    const handleVisibilityChange = () => {
      if (enabled && document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
}
