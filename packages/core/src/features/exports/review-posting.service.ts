import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { FINDING_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { RemoteChangesService } from '@~/features/code-hosts/remote-changes.service';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { ORPCBadRequestError, ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { cliCommands, curlCommands, hostCli } from './host-commands.utils';
import { changedLine, draftComment, draftLines } from './review-draft.utils';

export interface iPostingInput {
  snapshotId: string;
  statuses: FindingStatus[];
  findingIds?: string[];
}

/**
 * Posts a review's findings to its merge or pull request: GitLab draft notes, or one pending GitHub review.
 * Nothing is published or submitted; the reviewer does that on the host. A finding is posted at most once.
 */
@singleton()
export class ReviewPostingService {
  constructor(
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
    private readonly remoteChangesService: RemoteChangesService,
  ) {}

  /** What would be posted, where on the diff, and the same calls as `glab`/`gh` and curl commands. */
  public async preview(input: iPostingInput) {
    const draft = await this.prepare(input);
    const { provider, access, host, writes, comments, refs, findings, target } = draft;
    return {
      host,
      changeNumber: target.changeNumber ?? 0,
      webUrl: target.webUrl ?? undefined,
      isSnapshotOnHost: refs !== undefined,
      items: findings.map((finding) => {
        const comment = comments.find((candidate) => candidate.findingId === finding.id);
        return {
          findingId: finding.id,
          number: finding.number,
          kind: finding.kind,
          path: comment?.path,
          line: comment?.line,
          postedUrl: finding.post ? (finding.post.url ?? target.webUrl ?? undefined) : undefined,
          isPosted: finding.post !== undefined,
        };
      }),
      cli: hostCli(host),
      cliCommand: cliCommands(host, access.baseUrl, writes),
      curlCommand: curlCommands(host, provider.apiUrl(access.baseUrl), writes),
    };
  }

  public async post(input: iPostingInput) {
    const { provider, access, host, writes, target } = await this.prepare(input);
    if (writes.length === 0) throw ORPCUnprocessableContentError(errorCodes.NOTHING_TO_POST);
    let postedCount = 0;
    let url: string | undefined;
    for (const write of writes) {
      const created = await provider.postWrite(access, write);
      url ??= created.url;
      await this.findingRepository.addPosts(
        write.findingIds.map((findingId) => ({
          findingId,
          host,
          remoteId: created.remoteId,
          url: created.url ?? null,
        })),
      );
      postedCount += write.findingIds.length;
    }
    return { postedCount, url: url ?? target.webUrl ?? undefined };
  }

  private async prepare(input: iPostingInput) {
    const { target } = await this.reviewsService.getContext(input.snapshotId);
    if (target.kind !== REVIEW_TARGET_KINDS.CHANGE_REQUEST || !target.codeHost) {
      throw ORPCBadRequestError(errorCodes.NOT_A_CHANGE_REQUEST);
    }
    const snapshot = await this.snapshotRepository.findLatest(target.id);
    if (!snapshot) throw ORPCNotFoundError(errorCodes.SNAPSHOT_NOT_FOUND);
    const statuses = new Set(input.statuses);
    const wanted = input.findingIds ? new Set(input.findingIds) : undefined;
    const findings = (await this.findingRepository.list({ targetId: target.id }))
      .filter((finding) => statuses.has(finding.status) && (!wanted || wanted.has(finding.id)))
      .toSorted((left, right) => left.number - right.number);

    const { provider, access, project, changeNumber } = await this.remoteChangesService.locate(target);
    const [refs, regions, files] = await Promise.all([
      provider.diffRefs(access, project, changeNumber, snapshot.headSha),
      this.snapshotRepository.listRegions(snapshot.id),
      this.snapshotRepository.listFiles(snapshot.id),
    ]);
    const comments = findings
      .filter((finding) => !finding.post)
      .map((finding) => {
        const lines = draftLines(finding, snapshot.id);
        const line = refs && lines ? changedLine(regions, lines) : undefined;
        return draftComment(finding, lines, line, files);
      });
    const writes = comments.length > 0 ? provider.draftWrites(project, changeNumber, { refs, comments }) : [];
    return { provider, access, host: target.codeHost, writes, comments, refs, findings, target };
  }
}
