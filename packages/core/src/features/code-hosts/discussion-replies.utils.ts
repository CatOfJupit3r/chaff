import type { iFindingRecord, iNewFindingReply } from '@~/features/findings/findings.types';

import type { iRemoteDiscussion } from './code-hosts.types';

/** The label Chaff ends a posted finding with, e.g. `_Chaff F-3 · Concern_`. */
const POSTED_LABEL = /_Chaff F-(\d+)\b[^_]*_\s*$/;

export type iPostedFinding = Pick<iFindingRecord, 'id' | 'number' | 'post'>;

function postedNumber(body: string) {
  const match = POSTED_LABEL.exec(body);
  return match?.[1] ? Number(match[1]) : undefined;
}

/**
 * Finds the thread each posted finding became on the host, by the thread id stored earlier or by the label
 * its first note ends with, and returns the notes written after it as replies.
 */
export function matchReplies(findings: readonly iPostedFinding[], discussions: readonly iRemoteDiscussion[]) {
  const posted = findings.filter((finding) => finding.post);
  const links: { findingId: string; discussionId: string }[] = [];
  const replies: iNewFindingReply[] = [];
  for (const discussion of discussions) {
    const [first, ...rest] = discussion.notes;
    if (!first) continue;
    const linked = posted.find((finding) => finding.post?.discussionId === discussion.id);
    const number = linked ? undefined : postedNumber(first.body);
    const finding = linked ?? posted.find((candidate) => candidate.number === number && !candidate.post?.discussionId);
    if (!finding) continue;
    if (!linked) links.push({ findingId: finding.id, discussionId: discussion.id });
    replies.push(
      ...rest.map((note) => ({
        findingId: finding.id,
        remoteId: note.id,
        authorName: note.authorName,
        body: note.body,
        createdAt: note.createdAt,
      })),
    );
  }
  return { links, replies };
}
