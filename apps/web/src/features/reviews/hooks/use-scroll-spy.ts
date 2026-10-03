import { useEffect } from 'react';

/** Distance below the top of the scroll area at which a section counts as the current one. */
const SPY_OFFSET = 40;

export const FILE_SECTION_ATTRIBUTE = 'data-file-path';

/** Reports the file section at the top of `root` as it scrolls. */
export function useScrollSpy(root: HTMLElement | null, onChange: (path: string) => unknown) {
  useEffect(() => {
    if (!root) return undefined;

    const handleScroll = () => {
      const top = root.getBoundingClientRect().top + SPY_OFFSET;
      let current: string | undefined;
      for (const section of root.querySelectorAll<HTMLElement>(`[${FILE_SECTION_ATTRIBUTE}]`)) {
        if (section.getBoundingClientRect().top > top) break;
        current = section.getAttribute(FILE_SECTION_ATTRIBUTE) ?? undefined;
      }
      if (current) onChange(current);
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    return () => root.removeEventListener('scroll', handleScroll);
  }, [root, onChange]);
}

/** Scrolls `root` so the file's section starts at the top. */
export function scrollToFileSection(root: HTMLElement | null, path: string) {
  const section = root?.querySelector<HTMLElement>(`[${FILE_SECTION_ATTRIBUTE}="${CSS.escape(path)}"]`);
  if (root && section) root.scrollTop = section.offsetTop;
}

export function scrollToTop(root: HTMLElement | null) {
  if (root) root.scrollTop = 0;
}
