import { useCallback, useState } from 'react';

/** useState that survives reloads. Storage can be blocked (private mode), so every access is guarded. */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initialValue : JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* storage unavailable: keep in memory only */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
