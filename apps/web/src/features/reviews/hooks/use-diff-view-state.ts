import { debounce, parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { Values } from 'nuqs';
import { useMemo } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';
import { diffLayoutValues } from '@chaff/common/enums/diff.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { DIFF_MODES, diffModeValues } from '../reviews.enums';

const SCROLL_URL_DEBOUNCE_MS = 400;

function diffViewParsers(layout: DiffLayout) {
  return {
    file: parseAsString,
    mode: parseAsStringLiteral(diffModeValues).withDefault(DIFF_MODES.file),
    layout: parseAsStringLiteral(diffLayoutValues).withDefault(layout),
    wrap: parseAsBoolean.withDefault(false),
  };
}

/**
 * The Full diff screen's selected file, one-or-all mode, layout and line wrapping, kept in the URL. The layout
 * starts as the one picked in settings.
 */
export function useDiffViewState() {
  const { diffLayout } = useSettings();
  const parsers = useMemo(() => diffViewParsers(diffLayout), [diffLayout]);
  const [state, setState] = useQueryStates(parsers, { history: 'replace' });

  // nuqs applies the change to the URL in the background; nothing waits for it.
  const update = (patch: Partial<Values<ReturnType<typeof diffViewParsers>>>) => {
    setState(patch).catch(() => undefined);
  };

  // While scrolling, the state follows at once but the URL is written only once the scrolling settles.
  const followScroll = (file: string) => {
    setState({ file }, { limitUrlUpdates: debounce(SCROLL_URL_DEBOUNCE_MS) }).catch(() => undefined);
  };

  return { ...state, update, followScroll };
}
