import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';
import { INITIAL_ONBOARDING } from '@chaff/common/constants/onboarding.constants';
import {
  ACCENTS,
  CODE_FONTS,
  CODE_LINE_HEIGHTS,
  CODE_SIZES,
  DENSITIES,
  SYNTAX_THEMES,
  THEME_MODES,
} from '@chaff/common/enums/appearance.enums';
import { DIFF_CONTEXTS, DIFF_LAYOUTS, INLINE_DIFFS } from '@chaff/common/enums/diff.enums';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { EDITORS } from '@chaff/common/enums/editors.enums';
import { ONBOARDING_HINTS, ONBOARDING_ITEMS, ONBOARDING_STATUSES } from '@chaff/common/enums/onboarding.enums';
import { REVIEW_PROGRESSIONS, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { OnboardingGuide } from '@~/features/onboarding/components/onboarding-guide';
import { ReplayOnboarding } from '@~/features/onboarding/components/replay-onboarding';
import { reportGuideAction } from '@~/features/onboarding/guide-action-events';
import type { iOnboardingState } from '@~/features/onboarding/onboarding.types';
import { CORE_ITEMS } from '@~/features/onboarding/onboarding.utils';
import { settingsQueryOptions } from '@~/features/settings/hooks/use-settings';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

const rpc = vi.hoisted(() => ({
  save: vi.fn(),
  replay: vi.fn(),
  navigate: vi.fn(),
  params: {} as Record<string, string>,
  pathname: '/',
}));

vi.mock('@~/utils/orpc', () => ({
  default: {
    settings: { get: vi.fn(), update: vi.fn(), updateOnboarding: rpc.save, replayOnboarding: rpc.replay },
    workspaces: { add: vi.fn() },
    reviews: { start: vi.fn(), setMarks: vi.fn(), refresh: vi.fn() },
    codeHosts: { startChange: vi.fn() },
    digests: { start: vi.fn() },
    findings: { create: vi.fn(), setSeverity: vi.fn(), suggestTask: vi.fn(), setStatus: vi.fn() },
    exports: { post: vi.fn() },
    changeUnits: {
      create: vi.fn(),
      moveUnits: vi.fn(),
      merge: vi.fn(),
      rename: vi.fn(),
      reorder: vi.fn(),
      remove: vi.fn(),
      useDigest: vi.fn(),
    },
  },
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => rpc.navigate,
  useParams: () => rpc.params,
  useLocation: () => ({ pathname: rpc.pathname, search: {} }),
}));
vi.mock('@~/features/settings/hooks/use-settings', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const { tanstackRPC: utils } = await import('@~/utils/tanstack-orpc');
  const options = utils.settings.get.queryOptions();
  return { settingsQueryOptions: options, useSettings: () => useQuery(options).data };
});

const IN_PROGRESS = { ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS };
const CHECKLIST = { name: 'Getting started' };

function settingsWith(onboarding: iOnboardingState) {
  return {
    editor: EDITORS.CURSOR,
    theme: THEME_MODES.DARK,
    accent: ACCENTS.TEAL,
    codeSize: CODE_SIZES.LARGE,
    codeFont: CODE_FONTS.GEIST_MONO,
    codeLineHeight: CODE_LINE_HEIGHTS.DEFAULT,
    density: DENSITIES.COMFORTABLE,
    syntaxLight: SYNTAX_THEMES.CHAFF,
    syntaxDark: SYNTAX_THEMES.CHAFF,
    diffLayout: DIFF_LAYOUTS.unified,
    diffContext: DIFF_CONTEXTS.THREE,
    isWhitespaceIgnored: false,
    inlineDiff: INLINE_DIFFS.WORD,
    navigatorWidth: NAVIGATOR_WIDTH.default,
    isContextPanelPinned: false,
    defaultProgression: REVIEW_PROGRESSIONS.changes,
    digestRunner: DIGEST_RUNNERS.CLAUDE_CODE,
    agentCommands: [],
    digestModels: [],
    authorEmails: [],
    shortcuts: [],
    onboarding,
  };
}

function mountGuide(onboarding: iOnboardingState = INITIAL_ONBOARDING) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  client.setQueryData(settingsQueryOptions.queryKey, settingsWith(onboarding));
  const view = render(
    <Provider store={createStore()}>
      <QueryClientProvider client={client}>
        <OnboardingGuide />
        <ReplayOnboarding />
      </QueryClientProvider>
    </Provider>,
  );
  return { client, ...view };
}

function readState(client: QueryClient) {
  return client.getQueryData(settingsQueryOptions.queryKey)?.onboarding;
}

async function runMutation(client: QueryClient, options: object, variables: unknown, isFailing = false) {
  const mutation = client.getMutationCache().build(client, {
    ...options,
    mutationFn: async () => {
      if (isFailing) throw new Error('Save failed');
      return {};
    },
  });
  await act(async () => {
    await mutation.execute(variables).catch(() => undefined);
  });
}

function openItem(title: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${title}`) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  rpc.params = {};
  rpc.pathname = '/';
  rpc.navigate.mockImplementation(async ({ to }: { to: string }) => {
    rpc.pathname = to;
  });
  rpc.save.mockImplementation(async (state: iOnboardingState) => state);
  rpc.replay.mockResolvedValue(IN_PROGRESS);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => {
    const rects = [new DOMRect(100, 100, 120, 40)];
    return Object.assign(rects, { item: (index: number) => rects[index] ?? null });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getting started checklist', () => {
  it('opens expanded with a welcome on first run, and Start opens the first item without moving the app', async () => {
    const { client } = mountGuide();
    const panel = screen.getByRole('region', CHECKLIST);
    expect(within(panel).getByText('Learn Chaff on one of your own changes')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.IN_PROGRESS));
    expect(screen.getByRole('button', { name: /^Add a repository/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Show me' })).toBeInTheDocument();
    expect(rpc.navigate).not.toHaveBeenCalled();
  });

  it.each([ONBOARDING_STATUSES.COMPLETED, ONBOARDING_STATUSES.SKIPPED])('keeps a %s guide closed', (status) => {
    mountGuide({ ...INITIAL_ONBOARDING, status });
    expect(screen.queryByRole('region', CHECKLIST)).not.toBeInTheDocument();
    expect(rpc.save).not.toHaveBeenCalled();
  });

  it('skips for good from the welcome', async () => {
    const { client } = mountGuide();
    fireEvent.click(screen.getByRole('button', { name: 'Skip guide' }));
    await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.SKIPPED));
    expect(rpc.save.mock.lastCall?.[0]).toMatchObject({ status: ONBOARDING_STATUSES.SKIPPED });
    expect(screen.queryByRole('region', CHECKLIST)).not.toBeInTheDocument();
  });

  it('folds to a progress pill and opens again', () => {
    mountGuide({ ...IN_PROGRESS, completedItems: [ONBOARDING_ITEMS.ADD_REPOSITORY] });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse getting started' }));
    const pill = screen.getByRole('button', { name: `Getting started, 1 of ${CORE_ITEMS.length} done` });
    expect(screen.queryByRole('region', CHECKLIST)).not.toBeInTheDocument();
    fireEvent.click(pill);
    expect(screen.getByRole('region', CHECKLIST)).toBeInTheDocument();
  });

  it('replays from Settings with progress reset and the checklist open', async () => {
    const { client } = mountGuide({
      status: ONBOARDING_STATUSES.COMPLETED,
      completedItems: [...CORE_ITEMS],
      shownHints: [ONBOARDING_HINTS.FOCUS],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replay onboarding guide' }));
    await waitFor(() => expect(readState(client)).toEqual(IN_PROGRESS));
    expect(rpc.replay).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', CHECKLIST)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Add a repository/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('checks off an item from a real decision made anywhere, ignoring failed ones', async () => {
    const { client } = mountGuide(IN_PROGRESS);
    const options = tanstackRPC.reviews.setMarks.mutationOptions();
    const variables = { snapshotId: 'review', marks: [{ unitId: 'unit', mark: UNIT_MARKS.LATER }] };

    await runMutation(client, options, variables, true);
    expect(readState(client)?.completedItems).toEqual([]);

    await runMutation(client, options, variables);
    await waitFor(() => expect(readState(client)?.completedItems).toEqual([ONBOARDING_ITEMS.LATER]));
    expect(rpc.save.mock.lastCall?.[0]).toMatchObject({ completedItems: [ONBOARDING_ITEMS.LATER] });
    expect(screen.getByRole('button', { name: /^Leave a card for Later, done/ })).toBeInTheDocument();
  });

  it('accepts items in any order and starts a first-run guide when the user acts before pressing Start', async () => {
    const { client } = mountGuide();
    await runMutation(client, tanstackRPC.findings.create.mutationOptions(), { snapshotId: 'review' });
    act(() => reportGuideAction(ONBOARDING_ITEMS.KEY_LIST));

    await waitFor(() =>
      expect(readState(client)).toMatchObject({
        status: ONBOARDING_STATUSES.IN_PROGRESS,
        completedItems: [ONBOARDING_ITEMS.NOTE, ONBOARDING_ITEMS.KEY_LIST],
      }),
    );
    expect(screen.getByText(`2 of ${CORE_ITEMS.length}`)).toBeInTheDocument();
  });

  it('closes a tip with Esc without skipping the guide or reaching other Esc handlers', async () => {
    const { client } = mountGuide(IN_PROGRESS);
    const onEscape = vi.fn();
    document.addEventListener('keydown', onEscape);
    try {
      openItem('Open Jump to');
      fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
      expect(screen.getByRole('dialog', { name: 'Open Jump to' })).toBeInTheDocument();

      fireEvent.keyDown(document.body, { key: 'Escape' });

      expect(screen.queryByRole('dialog', { name: 'Open Jump to' })).not.toBeInTheDocument();
      expect(onEscape).not.toHaveBeenCalled();
      expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.IN_PROGRESS);
      expect(screen.getByRole('region', CHECKLIST)).toBeInTheDocument();

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(rpc.save).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', onEscape);
    }
  });

  it('navigates only for Show me, rings the real control, and closes the tip once the action is done', async () => {
    rpc.pathname = '/settings';
    const anchor = document.createElement('button');
    anchor.dataset.onboarding = ONBOARDING_ITEMS.FINDINGS;
    const onAnchorClick = vi.fn();
    anchor.addEventListener('click', onAnchorClick);
    document.body.append(anchor);
    const { client } = mountGuide(IN_PROGRESS);
    try {
      expect(rpc.navigate).not.toHaveBeenCalled();
      openItem('Set a severity or suggest a task');
      fireEvent.click(screen.getByRole('button', { name: 'Show me' }));

      expect(rpc.navigate).toHaveBeenCalledWith({ to: '/findings' });
      expect(screen.getByRole('dialog', { name: 'Set a severity or suggest a task' })).toBeInTheDocument();
      expect(onAnchorClick).not.toHaveBeenCalled();

      await runMutation(client, tanstackRPC.findings.setSeverity.mutationOptions(), { findingId: 'f', severity: null });
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Set a severity or suggest a task' })).not.toBeInTheDocument(),
      );
      expect(readState(client)?.completedItems).toEqual([ONBOARDING_ITEMS.FINDINGS]);
    } finally {
      anchor.remove();
    }
  });

  it('says it is set once the last counted item is done, and completes the guide', async () => {
    const { client } = mountGuide({ ...IN_PROGRESS, completedItems: CORE_ITEMS.slice(1) });
    act(() => reportGuideAction(ONBOARDING_ITEMS.ADD_REPOSITORY));
    await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.COMPLETED));
    expect(screen.getByText("You're set")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', CHECKLIST)).not.toBeInTheDocument();
  });

  it('shows a screen hint on the first visit only and remembers it', async () => {
    rpc.pathname = '/settings';
    const { client, unmount } = mountGuide(IN_PROGRESS);
    const hint = screen.getByRole('region', { name: 'Try on Settings' });
    expect(within(hint).getByRole('button', { name: 'Change appearance or a key' })).toBeInTheDocument();
    await waitFor(() => expect(readState(client)?.shownHints).toEqual([ONBOARDING_HINTS.SETTINGS]));
    unmount();

    mountGuide({ ...IN_PROGRESS, shownHints: [ONBOARDING_HINTS.SETTINGS] });
    expect(screen.queryByRole('region', { name: 'Try on Settings' })).not.toBeInTheDocument();
  });

  it('checks off the Full diff when the user opens it', async () => {
    rpc.pathname = '/reviews/review/diff';
    const { client } = mountGuide(IN_PROGRESS);
    await waitFor(() => expect(readState(client)?.completedItems).toContain(ONBOARDING_ITEMS.FULL_DIFF));
  });
});
