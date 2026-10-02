import { useMemo, useState } from 'react';

import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';

import { buildFileTree, flattenFileTree } from '../file-tree.utils';
import { DIFF_MODES } from '../reviews.enums';
import { useDiffViewState } from './use-diff-view-state';
import { useOpenInEditor } from './use-open-in-editor';
import { scrollToFileSection, scrollToTop, useScrollSpy } from './use-scroll-spy';
import { useSnapshot } from './use-snapshot';

/** State of the Full diff screen: the snapshot, its files in tree order and the file being looked at. */
export function useFullDiff(snapshotId: string) {
  const snapshot = useSnapshot(snapshotId);
  const workspace = useWorkspaces().find((candidate) => candidate.id === snapshot.workspaceId);
  const view = useDiffViewState();
  const { file: viewedPath, update: updateView, followScroll } = view;
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const openInEditor = useOpenInEditor(workspace?.repoPath ?? '');

  const files = useMemo(() => flattenFileTree(buildFileTree(snapshot.files)), [snapshot.files]);
  const currentFile = files.find((file) => file.path === viewedPath) ?? files[0];
  const isAllFiles = view.mode === DIFF_MODES.all;

  useScrollSpy(isAllFiles ? scrollRoot : null, followScroll);

  const selectFile = (path: string) => {
    updateView({ file: path });
    if (isAllFiles) scrollToFileSection(scrollRoot, path);
    else scrollToTop(scrollRoot);
  };

  return {
    snapshot,
    repositoryName: workspace?.name ?? snapshot.branch,
    files,
    currentFile,
    view,
    isAllFiles,
    scrollRoot,
    setScrollRoot,
    selectFile,
    openInEditor,
  };
}
