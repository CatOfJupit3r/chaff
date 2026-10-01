import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

export const editorsEnumwaii = new Enumwaii('Editor', ['VSCODE', 'VSCODE_INSIDERS', 'CURSOR']);

export const EDITORS = editorsEnumwaii.enum;
export type Editor = InferEnumwaii<typeof editorsEnumwaii>;
export const editorSchema = editorsEnumwaii.schema;

export const EDITOR_LABELS = editorsEnumwaii.derive({
  [EDITORS.VSCODE]: 'VS Code',
  [EDITORS.VSCODE_INSIDERS]: 'Insiders',
  [EDITORS.CURSOR]: 'Cursor',
});

export const EDITOR_URL_SCHEMES = editorsEnumwaii.derive({
  [EDITORS.VSCODE]: 'vscode',
  [EDITORS.VSCODE_INSIDERS]: 'vscode-insiders',
  [EDITORS.CURSOR]: 'cursor',
});

export const editorValues = editorsEnumwaii.values;
