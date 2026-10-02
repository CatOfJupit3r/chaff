import { useEffect, useRef } from 'react';

import { lastSectionAbove } from '../scroll-spy.utils';

/** Distance below the top of the scroll area at which a section counts as the current one. */
const SPY_OFFSET = 40;

export const FILE_SECTION_ATTRIBUTE = 'data-file-path';

/** Reports the file section at the top of `root` as it scrolls, measuring at most once per frame. */
export function useScrollSpy(root: HTMLElement | null, onChange: (path: string) => unknown) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!root) return undefined;
    let frame = 0;
    let reported: string | undefined;

    const measure = () => {
      frame = 0;
      const sections = root.querySelectorAll<HTMLElement>(`[${FILE_SECTION_ATTRIBUTE}]`);
      const index = lastSectionAbove(sections, root.getBoundingClientRect().top + SPY_OFFSET);
      const current = index === -1 ? undefined : (sections[index]?.getAttribute(FILE_SECTION_ATTRIBUTE) ?? undefined);
      if (current && current !== reported) {
        reported = current;
        onChangeRef.current(current);
      }
    };
    const handleScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frame);
    };
  }, [root]);
}

/** Scrolls `root` so the file's section starts at the top. */
export function scrollToFileSection(root: HTMLElement | null, path: string) {
  const section = root?.querySelector<HTMLElement>(`[${FILE_SECTION_ATTRIBUTE}="${CSS.escape(path)}"]`);
  if (root && section) root.scrollTop = section.offsetTop;
}

export function scrollToTop(root: HTMLElement | null) {
  if (root) root.scrollTop = 0;
}
