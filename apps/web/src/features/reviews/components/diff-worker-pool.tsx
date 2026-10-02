import { useWorkerPool, WorkerPoolContextProvider } from '@pierre/diffs/react';
import DiffsWorker from '@pierre/diffs/worker/worker.js?worker';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { DIFF_THEME_NAME } from '../diff-theme';
import { useDiffPreferences } from '../hooks/use-diff-preferences';

/** Highlighting workers kept for the whole app: half the cores, between one and four. */
const POOL_SIZE = Math.min(4, Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2)));

const POOL_OPTIONS = { workerFactory: () => new DiffsWorker(), poolSize: POOL_SIZE };

/** Keeps the workers' inline change marking in step with the diff settings. */
function WorkerRenderOptionsSync() {
  const pool = useWorkerPool();
  const { lineDiffType } = useDiffPreferences().viewerOptions;

  useEffect(() => {
    pool?.setRenderOptions({ lineDiffType }).catch(() => undefined);
  }, [pool, lineDiffType]);

  return null;
}

/**
 * Syntax highlighting for every diff runs in background workers, so opening or scrolling large diffs keeps the
 * window responsive. If the workers can't start, the diffs highlight on the main thread.
 */
export function DiffWorkerPool({ children }: { children: ReactNode }) {
  const { lineDiffType } = useDiffPreferences().viewerOptions;

  return (
    <WorkerPoolContextProvider
      poolOptions={POOL_OPTIONS}
      highlighterOptions={{ theme: DIFF_THEME_NAME, preferredHighlighter: 'shiki-js', lineDiffType }}
    >
      <WorkerRenderOptionsSync />
      {children}
    </WorkerPoolContextProvider>
  );
}
