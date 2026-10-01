import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { Values } from 'nuqs';

import { DIFF_LAYOUTS, DIFF_MODES, diffLayoutValues, diffModeValues } from '../reviews.enums';

const diffViewParsers = {
  file: parseAsString,
  mode: parseAsStringLiteral(diffModeValues).withDefault(DIFF_MODES.file),
  layout: parseAsStringLiteral(diffLayoutValues).withDefault(DIFF_LAYOUTS.unified),
  wrap: parseAsBoolean.withDefault(false),
};

/** The Full diff screen's selected file, one-or-all mode, layout and line wrapping, kept in the URL. */
export function useDiffViewState() {
  const [state, setState] = useQueryStates(diffViewParsers, { history: 'replace' });

  // nuqs applies the change to the URL in the background; nothing waits for it.
  const update = (patch: Partial<Values<typeof diffViewParsers>>) => {
    setState(patch).catch(() => undefined);
  };

  return { ...state, update };
}
