import { createContext, useContext } from 'react';

import type { DiffSide } from '@chaff/common/enums/review.enums';

/** The version of a repository file being drawn, so the files it links to are read from the same version. */
export interface iRepoFileVersion {
  snapshotId: string;
  side: DiffSide;
  path: string;
}

export const RepoFileVersionContext = createContext<iRepoFileVersion | undefined>(undefined);

export function useRepoFileVersion() {
  const version = useContext(RepoFileVersionContext);
  if (!version) throw new Error('useRepoFileVersion needs a RepoFileVersionContext provider');
  return version;
}
