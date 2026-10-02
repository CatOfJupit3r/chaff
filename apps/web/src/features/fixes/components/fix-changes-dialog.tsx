import { PatchDiff } from '@pierre/diffs/react';
import { useQuery } from '@tanstack/react-query';

import { Dialog, DialogBody, DialogContent, DialogHeader } from '@~/components/ui/dialog';
import { useIsDarkMode } from '@~/features/appearance/hooks/use-is-dark-mode';
import { DIFF_THEME_NAME } from '@~/features/reviews/diff-theme';
import { useDiffPreferences } from '@~/features/reviews/hooks/use-diff-preferences';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFix } from '../fixes.types';
import { findingLabels, splitPatch } from '../fixes.utils';

interface iFixChangesDialogProps {
  fix: iFix;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** What the agent changed, file by file, read from its branch in the store. */
export function FixChangesDialog({ fix, isOpen, onOpenChange }: iFixChangesDialogProps) {
  const isDark = useIsDarkMode();
  const { viewerOptions } = useDiffPreferences();
  const { data } = useQuery(tanstackRPC.fixes.patch.queryOptions({ input: { fixId: fix.id }, enabled: isOpen }));
  const files = splitPatch(data?.patch ?? '');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1000px,100%)]">
        <DialogHeader
          title={`Changes for ${findingLabels(fix.findingNumbers)}`}
          description={`On ${fix.branch} in Chaff's store, from ${fix.baseSha.slice(0, 7)}.`}
        />
        <DialogBody className="max-h-[70vh] overflow-auto">
          {files.map((file) => (
            <section key={file.path} className="shrink-0 overflow-hidden rounded-md border border-line">
              <div className="border-b border-line bg-raised px-3 py-1.5 font-mono text-[12px] text-muted">
                {file.path}
              </div>
              <PatchDiff
                patch={file.patch}
                disableWorkerPool
                options={{
                  theme: DIFF_THEME_NAME,
                  themeType: isDark ? 'dark' : 'light',
                  diffStyle: 'unified',
                  disableFileHeader: true,
                  preferredHighlighter: 'shiki-js',
                  diffIndicators: 'classic',
                  lineDiffType: viewerOptions.lineDiffType,
                }}
              />
            </section>
          ))}
          {data && files.length === 0 ? <p className="m-0 text-muted">The agent changed no files.</p> : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
