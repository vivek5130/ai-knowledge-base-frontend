import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Theme mode 'light' | 'dark' | 'system'. Toggles the `dark` class on <html>. */
export function useTheme() {
  const [mode, setMode] = useLocalStorage('theme-mode', 'dark');
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const query = media();
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  return { mode, setMode, resolved };
}
