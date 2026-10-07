import { useMemo } from 'react';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { useDiscussions } from '@~/features/code-hosts/hooks/use-discussions';
import { useFindings } from '@~/features/findings/hooks/use-findings';

import { placeDiscussions, placeFindings } from '../finding-placements.utils';
import type { iLineNotes } from '../line-notes.context';
import type { iSnapshot } from '../reviews.types';
import { useLineNoteDraft } from './use-line-note-draft';

/** Every finding and merge request thread under its lines, and notes written on lines picked in any file. */
export function useFullDiffLineNotes(snapshot: iSnapshot): iLineNotes {
  const findings = useFindings(snapshot.targetId);
  const placementsByFile = useMemo(() => placeFindings(snapshot.id, findings), [snapshot.id, findings]);
  const discussions = useDiscussions(snapshot.id, snapshot.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST);
  const discussionsByFile = useMemo(() => placeDiscussions(snapshot, discussions), [snapshot, discussions]);
  const draft = useLineNoteDraft(snapshot.id);

  return { headSha: snapshot.headSha, placementsByFile, discussionsByFile, ...draft };
}
