import type { ComponentProps, ComponentType } from 'react';

export interface iMarkdownProps {
  text: string;
  baseUrl?: string;
  className?: string;
  /** Draws images instead of linking them; gets `src` as written, not checked as an https URL. */
  image?: ComponentType<Pick<ComponentProps<'img'>, 'src' | 'alt'>>;
}
