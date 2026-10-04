import { FILE_PREVIEWS, IMAGE_MIME_TYPES } from '../enums/file-preview.enums';
import type { FilePreview, ImageMimeType } from '../enums/file-preview.enums';

const IMAGE_EXTENSIONS = new Map<string, ImageMimeType>([
  ['png', IMAGE_MIME_TYPES['image/png']],
  ['apng', IMAGE_MIME_TYPES['image/png']],
  ['jpg', IMAGE_MIME_TYPES['image/jpeg']],
  ['jpeg', IMAGE_MIME_TYPES['image/jpeg']],
  ['gif', IMAGE_MIME_TYPES['image/gif']],
  ['webp', IMAGE_MIME_TYPES['image/webp']],
  ['avif', IMAGE_MIME_TYPES['image/avif']],
  ['bmp', IMAGE_MIME_TYPES['image/bmp']],
  ['ico', IMAGE_MIME_TYPES['image/x-icon']],
  ['svg', IMAGE_MIME_TYPES['image/svg+xml']],
]);

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown']);
const MERMAID_EXTENSIONS = new Set(['mmd', 'mermaid']);

function extensionOf(path: string) {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** The image format a path names by its extension. */
export function imageMimeTypeOf(path: string): ImageMimeType | undefined {
  return IMAGE_EXTENSIONS.get(extensionOf(path));
}

/** How a file at this path can be drawn, when it can. */
export function filePreviewOf(path: string): FilePreview | undefined {
  const extension = extensionOf(path);
  if (IMAGE_EXTENSIONS.has(extension)) return FILE_PREVIEWS.IMAGE;
  if (MARKDOWN_EXTENSIONS.has(extension)) return FILE_PREVIEWS.MARKDOWN;
  if (MERMAID_EXTENSIONS.has(extension)) return FILE_PREVIEWS.MERMAID;
  if (extension === 'csv') return FILE_PREVIEWS.CSV;
  if (extension === 'tsv') return FILE_PREVIEWS.TSV;
  return undefined;
}
