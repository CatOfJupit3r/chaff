import { useEffect, useRef } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';

import { pluralize } from '@~/utils/pluralize';

import { scrollToFileSection } from '../hooks/use-scroll-spy';
import type { iSnapshotFile } from '../reviews.types';
import { DiffFileSection } from './diff-file-section';

interface iAllFilesViewProps {
  snapshotId: string;
  files: readonly iSnapshotFile[];
  /** File to start at; later changes come from scrolling and do not move the view. */
  initialPath?: string;
  scrollRoot: HTMLElement | null;
  layout: DiffLayout;
  isWrapped: boolean;
  onOpenInEditor: (path: string) => void;
}

/** Every changed file in tree order, each loading its diff as it scrolls into view. */
export function AllFilesView({ snapshotId, files, initialPath, scrollRoot, ...sectionProps }: iAllFilesViewProps) {
  const startPath = useRef(initialPath);

  useEffect(() => {
    if (startPath.current) scrollToFileSection(scrollRoot, startPath.current);
  }, [scrollRoot]);

  return (
    <>
      {files.map((file) => (
        <DiffFileSection key={file.id} snapshotId={snapshotId} file={file} scrollRoot={scrollRoot} {...sectionProps} />
      ))}
      <p className="m-0 px-4 pt-[18px] pb-7 text-center text-[12.5px] text-faint">
        End of the diff. {pluralize(files.length, 'file')}, loaded as you scrolled.
      </p>
    </>
  );
}
