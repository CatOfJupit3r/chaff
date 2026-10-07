import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** How a changed file can be shown drawn rather than as lines. */
export const filePreviewsEnumwaii = em(['IMAGE', 'MARKDOWN', 'MERMAID', 'CSV', 'TSV']);

export const FILE_PREVIEWS = filePreviewsEnumwaii.enum;
export type FilePreview = InferEnumwaii<typeof filePreviewsEnumwaii>;

// Values are MIME types because they go into data URLs as they are.
export const imageMimeTypesEnumwaii = em([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/svg+xml',
]);

export const IMAGE_MIME_TYPES = imageMimeTypesEnumwaii.enum;
export type ImageMimeType = InferEnumwaii<typeof imageMimeTypesEnumwaii>;
export const imageMimeTypeSchema = emToZodSchema(imageMimeTypesEnumwaii);
