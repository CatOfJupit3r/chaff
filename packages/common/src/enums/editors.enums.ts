import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

export const editorsEnumwaii = em(['VSCODE', 'VSCODE_INSIDERS', 'CURSOR']);

export const EDITORS = editorsEnumwaii.enum;
export type Editor = InferEnumwaii<typeof editorsEnumwaii>;
export const editorSchema = emToZodSchema(editorsEnumwaii);

export const EDITOR_LABELS = editorsEnumwaii.derive(
  [EDITORS.VSCODE, 'VS Code'],
  [EDITORS.VSCODE_INSIDERS, 'Insiders'],
  [EDITORS.CURSOR, 'Cursor'],
);

export const EDITOR_URL_SCHEMES = editorsEnumwaii.derive(
  [EDITORS.VSCODE, 'vscode'],
  [EDITORS.VSCODE_INSIDERS, 'vscode-insiders'],
  [EDITORS.CURSOR, 'cursor'],
);

export const editorValues = editorsEnumwaii.values;
