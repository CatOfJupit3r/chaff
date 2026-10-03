import { useEffect, useState } from 'react';

/** Changes whenever the theme, accent, code font or size, or syntax colors on `<html>` change, for drawings that bake them in. */
export function useThemeVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((current) => current + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'class',
        'data-accent',
        'data-code-size',
        'data-code-font',
        'data-syntax-light',
        'data-syntax-dark',
      ],
    });
    return () => observer.disconnect();
  }, []);

  return version;
}
