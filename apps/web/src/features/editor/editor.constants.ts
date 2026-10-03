import { EDITOR_LABELS, editorValues } from '@chaff/common/enums/editors.enums';

export const EDITOR_OPTIONS = editorValues.map((value) => ({ value, label: EDITOR_LABELS.get(value) }));

/** File the example link in the editor dialog points at. */
export const EXAMPLE_FILE = { path: 'README.md', line: 1 };
