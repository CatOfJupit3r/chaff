import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { ONBOARDING_STATUSES, ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';
import { REVIEW_PROGRESSIONS, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { OnboardingGuide } from '@~/features/onboarding/components/onboarding-guide';
import { ReplayOnboarding } from '@~/features/onboarding/components/replay-onboarding';
import type { iOnboardingState } from '@~/features/onboarding/onboarding.types';
import { settingsQueryOptions } from '@~/features/settings/hooks/use-settings';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

interface iTestRouteParams {
  snapshotId?: string;
}

const rpc = vi.hoisted(() => {
  const params: iTestRouteParams = {};
  return { save: vi.fn(), replay: vi.fn(), snapshot: vi.fn(), navigate: vi.fn(), params, pathname: '/settings' };
});

vi.mock('@~/utils/orpc', () => ({
  default: {
    settings: { get: vi.fn(), updateOnboarding: rpc.save, replayOnboarding: rpc.replay },
    reviews: { snapshot: rpc.snapshot, setMarks: vi.fn() },
    findings: { create: vi.fn() },
  },
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => rpc.navigate,
  useParams: () => rpc.params,
  useLocation: () => ({ pathname: rpc.pathname }),
}));
vi.mock('@~/features/settings/hooks/use-settings', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const { tanstackRPC } = await import('@~/utils/tanstack-orpc');
  const options = tanstackRPC.settings.get.queryOptions();
  return { settingsQueryOptions: options, useSettings: () => useQuery(options).data };
});

class TestResizeObserver {
  public observe() {}
  public disconnect() {}
  public unobserve() {}
}

function mountGuide(onboarding: iOnboardingState = INITIAL_ONBOARDING) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  client.setQueryData(settingsQueryOptions.queryKey, {
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
    shortcuts: [],
    onboarding,
  });
  const view = render(
    <QueryClientProvider client={client}>
      <OnboardingGuide />
      <ReplayOnboarding />
    </QueryClientProvider>,
  );
  const rerenderRoute = () =>
    view.rerender(
      <QueryClientProvider client={client}>
        <OnboardingGuide />
        <ReplayOnboarding />
      </QueryClientProvider>,
    );
  return { client, ...view, rerenderRoute };
}

function readState(client: QueryClient) {
  return client.getQueryData<{ onboarding: iOnboardingState }>(settingsQueryOptions.queryKey)?.onboarding;
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.params = {};
  rpc.pathname = '/settings';
  rpc.navigate.mockImplementation(async ({ to, params }: { to: string; params?: iTestRouteParams }) => {
    rpc.pathname = to.replace('$snapshotId', params?.snapshotId ?? '');
    rpc.params = params ?? {};
  });
  rpc.save.mockImplementation(async (state: iOnboardingState) => state);
  rpc.snapshot.mockResolvedValue({ workspaceId: 'workspace', branch: 'feature' });
  rpc.replay.mockResolvedValue({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS });
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => {
    const rects = [new DOMRect(100, 100, 120, 40)];
    return Object.assign(rects, { item: (index: number) => rects[index] ?? null });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('onboarding guide', () => {
  it('opens on first run and persists that it started', async () => {
    const { client } = mountGuide();
    expect(screen.getByRole('region', { name: 'Onboarding guide' })).toBeInTheDocument();
    await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.IN_PROGRESS));
    expect(rpc.navigate).toHaveBeenCalledWith({ to: '/' });
  });

  it.each([ONBOARDING_STATUSES.COMPLETED, ONBOARDING_STATUSES.SKIPPED])('keeps a %s guide closed', (status) => {
    mountGuide({ ...INITIAL_ONBOARDING, status });
    expect(screen.queryByRole('region', { name: 'Onboarding guide' })).not.toBeInTheDocument();
    expect(rpc.save).not.toHaveBeenCalled();
  });

  it.each([ONBOARDING_STEPS.CHOOSE_CHANGE, ONBOARDING_STEPS.CONTEXT, ONBOARDING_STEPS.DONE])(
    'skips with Esc at %s',
    async (step) => {
      const { client } = mountGuide({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS, step });
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.SKIPPED));
      expect(screen.queryByRole('region', { name: 'Onboarding guide' })).not.toBeInTheDocument();
    },
  );

  it('skips from the visible button, including while the first save is pending', async () => {
    let resolveStart: (state: iOnboardingState) => unknown = () => undefined;
    rpc.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
        }),
    );
    const { client } = mountGuide();
    await waitFor(() => expect(rpc.save).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Skip guide' }));
    resolveStart({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS });
    await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.SKIPPED));
  });

  it('resumes the saved step and review rather than starting over', async () => {
    mountGuide({ status: ONBOARDING_STATUSES.IN_PROGRESS, step: ONBOARDING_STEPS.FULL_DIFF, reviewId: 'saved-review' });
    expect(screen.getByText('Read the full diff')).toBeInTheDocument();
    await waitFor(() =>
      expect(rpc.navigate).toHaveBeenCalledWith({
        to: '/reviews/$snapshotId/diff',
        params: { snapshotId: 'saved-review' },
      }),
    );
    expect(rpc.save).not.toHaveBeenCalled();
  });

  it('restores the saved Focus review before adopting any current route', async () => {
    rpc.params = { snapshotId: 'other-review' };
    rpc.pathname = '/reviews/other-review';
    const { client } = mountGuide({
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      step: ONBOARDING_STEPS.ACCEPT,
      reviewId: 'saved-review',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    expect(rpc.navigate).toHaveBeenCalledWith({ to: '/reviews/$snapshotId', params: { snapshotId: 'saved-review' } });
    expect(readState(client)?.reviewId).toBe('saved-review');
    expect(rpc.save).not.toHaveBeenCalled();
  });

  it('shows the hosted stack list for a request whose branch is not local', async () => {
    rpc.snapshot.mockResolvedValue({
      workspaceId: 'workspace',
      branch: 'remote-only',
      change: { project: 'owner/repo' },
    });
    vi.stubGlobal('CSS', { escape: (value: string) => value });
    mountGuide({ status: ONBOARDING_STATUSES.IN_PROGRESS, step: ONBOARDING_STEPS.STACK, reviewId: 'hosted-review' });
    await waitFor(() => expect(screen.getByText(/Merge requests and pull requests are grouped/)).toBeInTheDocument());
    expect(rpc.navigate).toHaveBeenCalledWith({ to: '/' });
    expect(rpc.navigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/stack' }));
  });

  it('continues to History after the next branch review opens', async () => {
    rpc.params = { snapshotId: 'chosen-review' };
    rpc.pathname = '/reviews/chosen-review';
    const { client, rerenderRoute } = mountGuide({
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      step: ONBOARDING_STEPS.NEXT_BRANCH,
      reviewId: 'chosen-review',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    rpc.params = { snapshotId: 'next-review' };
    rpc.pathname = '/reviews/next-review';
    rerenderRoute();
    await waitFor(() =>
      expect(readState(client)).toMatchObject({ step: ONBOARDING_STEPS.HISTORY, reviewId: 'next-review' }),
    );
  });

  it('closes the real note composer through Cancel before Next continues', async () => {
    const composer = document.createElement('div');
    composer.setAttribute('role', 'dialog');
    composer.setAttribute('aria-modal', 'true');
    composer.setAttribute('aria-label', 'Write a note');
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    const onCancel = vi.fn(() => composer.setAttribute('aria-hidden', 'true'));
    cancel.addEventListener('click', onCancel);
    composer.append(cancel);
    document.body.append(composer);
    const { client, unmount } = mountGuide({
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      step: ONBOARDING_STEPS.COMMENT,
      reviewId: 'chosen-review',
    });
    try {
      await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(readState(client)?.step).toBe(ONBOARDING_STEPS.CONTEXT));
      expect(onCancel).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
      composer.remove();
    }
  });

  it('replays from the Settings action and clears the previous review', async () => {
    const { client } = mountGuide({
      status: ONBOARDING_STATUSES.COMPLETED,
      step: ONBOARDING_STEPS.DONE,
      reviewId: 'old-review',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replay onboarding guide' }));
    await waitFor(() =>
      expect(readState(client)).toEqual({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS }),
    );
    expect(screen.getByText('Pick a change of your own')).toBeInTheDocument();
    expect(rpc.replay).toHaveBeenCalledTimes(1);
  });

  it('lets Next explain starting a review, then waits for a real review to open', async () => {
    const { client } = mountGuide({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(readState(client)?.step).toBe(ONBOARDING_STEPS.START_REVIEW));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('finishes persistently from the final step', async () => {
    const { client } = mountGuide({
      ...INITIAL_ONBOARDING,
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      step: ONBOARDING_STEPS.DONE,
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.COMPLETED));
    expect(screen.queryByRole('region', { name: 'Onboarding guide' })).not.toBeInTheDocument();
  });

  it('continues on the real review the user opened', async () => {
    rpc.pathname = '/';
    const { client, rerenderRoute } = mountGuide({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS });
    rpc.params = { snapshotId: 'chosen-review' };
    rpc.pathname = '/reviews/chosen-review';
    rerenderRoute();
    await waitFor(() =>
      expect(readState(client)).toMatchObject({ step: ONBOARDING_STEPS.REVIEW_SWITCHER, reviewId: 'chosen-review' }),
    );
  });

  it('advances after a successful decision made by a key or swipe, and stays on failed decisions', async () => {
    rpc.params = { snapshotId: 'chosen-review' };
    rpc.pathname = '/reviews/chosen-review';
    const { client } = mountGuide({
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      step: ONBOARDING_STEPS.ACCEPT,
      reviewId: 'chosen-review',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    const variables = { snapshotId: 'chosen-review', marks: [{ unitId: 'unit', mark: UNIT_MARKS.LOOKS_GOOD }] };
    const failed = client.getMutationCache().build(client, {
      ...tanstackRPC.reviews.setMarks.mutationOptions(),
      mutationFn: async () => {
        throw new Error('Save failed');
      },
    });
    await expect(failed.execute(variables)).rejects.toThrow('Save failed');
    expect(readState(client)?.step).toBe(ONBOARDING_STEPS.ACCEPT);
    const succeeded = client.getMutationCache().build(client, {
      ...tanstackRPC.reviews.setMarks.mutationOptions(),
      mutationFn: async () => [{ unitId: 'unit', mark: UNIT_MARKS.LOOKS_GOOD }],
    });
    await succeeded.execute(variables);
    await waitFor(() => expect(readState(client)?.step).toBe(ONBOARDING_STEPS.LATER));
  });

  it('keeps a hidden note composer from hiding Skip guide', async () => {
    const composer = document.createElement('div');
    composer.setAttribute('role', 'dialog');
    composer.setAttribute('aria-modal', 'true');
    composer.setAttribute('aria-hidden', 'true');
    document.body.append(composer);
    try {
      const { client } = mountGuide({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS });
      const skip = screen.getByRole('button', { name: 'Skip guide' });
      expect(composer.contains(skip)).toBe(false);
      fireEvent.click(skip);
      await waitFor(() => expect(readState(client)?.status).toBe(ONBOARDING_STATUSES.SKIPPED));
    } finally {
      composer.remove();
    }
  });
});
