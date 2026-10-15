import { IMPORTED_ANCHOR_PROBLEM_LABELS } from '@chaff/common/enums/findings-import.enums';
import { FINDING_SCOPES, REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import { importedAnchorLines } from '@chaff/common/helpers/imported-anchor.helper';

import type { iFindingsImportResult } from '@~/features/findings/findings.types';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import type { iWorkspaceResponse } from '@~/features/workspaces/workspaces.types';

const SHORT_SHA = 10;

interface iStartedReview {
  workspace: iWorkspaceResponse;
  target: iReviewTargetRecord;
  snapshot: iSnapshotRecord;
  isContinued: boolean;
}

function reviewName(target: iReviewTargetRecord) {
  const branches = `${target.branch} onto ${target.parentBranch}`;
  if (target.kind !== REVIEW_TARGET_KINDS.CHANGE_REQUEST || target.changeNumber === null) return branches;
  const title = target.title ? ` "${target.title}"` : '';
  return `!${target.changeNumber}${title} (${branches})`;
}

/** What chaff_start_review tells the agent: the review, its snapshot, and how to write findings on it. */
export function formatStartedReview({ workspace, target, snapshot, isContinued }: iStartedReview) {
  const head = snapshot.headSha.slice(0, SHORT_SHA);
  return [
    `${isContinued ? 'Continued' : 'Started'} the review of ${reviewName(target)} in ${workspace.name} (${workspace.repoPath}).`,
    `Review: ${target.id}. Snapshot: ${snapshot.id} (version ${snapshot.version}, head ${head}, ${snapshot.fileCount} ${snapshot.fileCount === 1 ? 'file' : 'files'}, +${snapshot.additions} -${snapshot.deletions}).`,
    `Write findings with chaff_write_findings and snapshot "${snapshot.id}". Line numbers are those of commit ${head}; pass it as headSha.`,
  ].join('\n');
}

function findingRef({ id, number }: { id: string; number: number }) {
  return `F-${number} (${id})`;
}

/** What chaff_write_findings tells the agent: what it created, what was there already, and anchors left out. */
export function formatWrittenFindings(target: iReviewTargetRecord, result: iFindingsImportResult) {
  const lines = [
    result.created.length > 0
      ? `Created ${result.created.length} on ${reviewName(target)}: ${result.created.map(findingRef).join(', ')}.`
      : `Created no findings on ${reviewName(target)}.`,
  ];
  if (result.existing.length > 0) {
    lines.push(`Already in the review, left as they were: ${result.existing.map(findingRef).join(', ')}.`);
  }
  const unresolved = result.created.filter((finding) => finding.unresolvedAnchors.length > 0);
  if (unresolved.length > 0) {
    lines.push(
      "Anchors left out because they are not in the snapshot's diff (they are listed in each finding's body):",
    );
    for (const finding of unresolved) {
      const fallback = finding.scope === FINDING_SCOPES.BRANCH ? ' It now applies to the whole branch.' : '';
      const anchors = finding.unresolvedAnchors.map(
        (anchor) =>
          `${anchor.path} ${importedAnchorLines(anchor)} (${IMPORTED_ANCHOR_PROBLEM_LABELS.get(anchor.problem)})`,
      );
      lines.push(`- ${findingRef(finding)}: ${anchors.join('; ')}.${fallback}`);
    }
  }
  return lines.join('\n');
}
