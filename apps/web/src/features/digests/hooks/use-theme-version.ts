import { useEffect, useState } from 'react';

/** Changes whenever the theme, accent or code size on `<html>` changes, for drawings that bake colors in. */
export function useThemeVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((current) => current + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent'] });
    return () => observer.disconnect();
  }, []);

  return version;
}
