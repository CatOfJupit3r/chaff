import { pluralize } from '@~/utils/pluralize';

import type { iFileImage } from './reviews.types';

const BYTE_UNITS = ['kilobyte', 'megabyte'] as const;

/** An image's bytes as a URL an `<img>` can draw; an SVG drawn this way cannot run scripts. */
export function imageDataUrl(image: iFileImage) {
  return `data:${image.mimeType};base64,${image.data}`;
}

/** A byte count in the largest unit that keeps it at or above 1, e.g. "4.2 kB". */
export function formatByteSize(byteSize: number) {
  if (byteSize < 1000) return pluralize(byteSize, 'byte');
  let value = byteSize / 1000;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  return new Intl.NumberFormat('en', {
    style: 'unit',
    unit: BYTE_UNITS[unitIndex],
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** The repository path an image link in a Markdown file points to; undefined for links outside the repository. */
export function resolveRepoPath(markdownPath: string, src: string) {
  if (URL_SCHEME.test(src) || src.startsWith('//')) return undefined;
  let link: string;
  try {
    link = decodeURIComponent(src.split(/[?#]/)[0] ?? '');
  } catch {
    return undefined;
  }
  const parts = link.startsWith('/') ? [] : markdownPath.split('/').slice(0, -1);
  for (const part of link.split('/')) {
    if (part === '..') {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else if (part !== '' && part !== '.') {
      parts.push(part);
    }
  }
  return parts.length > 0 ? parts.join('/') : undefined;
}
