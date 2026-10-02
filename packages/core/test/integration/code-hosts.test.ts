import { call } from '@orpc/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CODE_HOSTS, INBOX_FILTERS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import {
  DIFF_SIDES,
  FINDING_KINDS,
  FINDING_STATUSES,
  REVIEW_TARGET_KINDS,
  findingStatusesEnumwaii,
} from '@chaff/common/enums/review.enums';

import { FakeCodeHost, GOOD_TOKEN, REVIEWER } from '../helpers/fake-code-host';
import { cloneTestGitRepo, createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter, fakeHost } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { addWorkspace } from '../helpers/review-repo';

let codeHost: FakeCodeHost;
let server: TestGitRepo;

/** The server has `main` and two stacked branches with a change each: !1 on main, !2 on !1's branch. */
function createServerRepo() {
  const repo = createTestGitRepo();
  repo.commitFiles('base', { 'src/retry.ts': 'export const retries = 1;\n' });
  repo.branch('feature/retry');
  repo.commitFiles('Retry three times', { 'src/retry.ts': 'export const retries = 3;\n' });
  repo.branch('feature/backoff');
  repo.commitFiles('Back off', { 'src/backoff.ts': 'export const backoff = (n: number) => 2 ** n;\n' });
  repo.switch('main');
  return repo;
}

/** A review of !2 with a concern on the line it adds and a note on the whole change. */
async function reviewWithFindings(host: CodeHost) {
  await connect(host);
  const { workspace } = await addClone(host === CODE_HOSTS.GITHUB ? 'owner/repo' : 'group/project');
  const { snapshotId } = await call(appRouter.codeHosts.startChange, { workspaceId: workspace.id, number: 2 });
  const [file] = (await call(appRouter.reviews.snapshot, { snapshotId })).files;
  const concern = await call(appRouter.findings.create, {
    snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'Cap the backoff',
    anchors: [{ fileId: file?.id ?? '', side: DIFF_SIDES.NEW, startLine: 1, endLine: 1 }],
  });
  const note = await call(appRouter.findings.create, {
    snapshotId,
    kind: FINDING_KINDS.NOTE,
    body: 'Nice and small',
    anchors: [],
  });
  return {
    workspace,
    snapshotId,
    concern,
    note,
    selection: { snapshotId, statuses: [...findingStatusesEnumwaii.values] },
  };
}

async function connect(host: CodeHost = CODE_HOSTS.GITLAB) {
  return call(appRouter.codeHosts.connect, { host, baseUrl: codeHost.baseUrl, token: GOOD_TOKEN });
}

/** A local clone whose origin points at the fake host, so its project is detected. */
async function addClone(project = 'group/project') {
  const clone = cloneTestGitRepo(server);
  clone.git('remote', 'set-url', 'origin', `${codeHost.baseUrl}/${project}.git`);
  return { clone, workspace: await addWorkspace(clone) };
}

describe('code hosts', () => {
  beforeEach(async () => {
    server = createServerRepo();
    codeHost = new FakeCodeHost(server);
    await codeHost.start();
    codeHost.open({
      number: 1,
      title: 'Retry three times',
      author: 'agent',
      sourceBranch: 'feature/retry',
      targetBranch: 'main',
      reviewers: [REVIEWER],
    });
    codeHost.open({
      number: 2,
      title: 'Back off',
      author: REVIEWER,
      sourceBranch: 'feature/backoff',
      targetBranch: 'feature/retry',
    });
  });

  afterEach(async () => {
    await codeHost.stop();
  });

  it('keeps a checked token in the keychain and never returns it', async () => {
    const connection = await connect();

    expect(connection).toEqual(expect.objectContaining({ host: CODE_HOSTS.GITLAB, username: REVIEWER }));
    expect(JSON.stringify(await call(appRouter.codeHosts.connections, undefined))).not.toContain(GOOD_TOKEN);
    expect([...fakeHost.secrets.values.values()]).toEqual([GOOD_TOKEN]);

    await call(appRouter.codeHosts.disconnect, { connectionId: connection.id });
    expect(fakeHost.secrets.values.size).toBe(0);
    expect(await call(appRouter.codeHosts.connections, undefined)).toEqual([]);
  });

  it('refuses a token the host rejects, and any token without a keychain', async () => {
    await expectORPCError(
      call(appRouter.codeHosts.connect, { host: CODE_HOSTS.GITLAB, baseUrl: codeHost.baseUrl, token: 'wrong' }),
      { code: errorCodes.CONNECTION_REJECTED },
    );
    fakeHost.secrets.isEncrypted = false;
    await expectORPCError(connect(), { code: errorCodes.SECRETS_UNAVAILABLE });
    expect(await call(appRouter.codeHosts.connections, undefined)).toEqual([]);
  });

  it('refuses to send a token over plain http to another computer', async () => {
    await expectORPCError(
      call(appRouter.codeHosts.connect, { host: CODE_HOSTS.GITLAB, baseUrl: 'http://gitlab.example.com', token: 'x' }),
      { code: errorCodes.UNSUPPORTED_EXTERNAL_URL },
    );
  });

  it("detects a repository's project from its remote, and lets you choose another", async () => {
    const connection = await connect();
    const { workspace } = await addClone();

    expect(await call(appRouter.codeHosts.workspaceRemote, { workspaceId: workspace.id })).toEqual({
      connectionId: connection.id,
      project: 'group/project',
      isDetected: true,
    });

    const chosen = await call(appRouter.codeHosts.setWorkspaceRemote, {
      workspaceId: workspace.id,
      remote: { connectionId: connection.id, project: 'other/project' },
    });
    expect(chosen).toEqual({ connectionId: connection.id, project: 'other/project', isDetected: false });
  });

  it.each([
    [INBOX_FILTERS.review, [1]],
    [INBOX_FILTERS.authored, [2]],
    [INBOX_FILTERS.all, [1, 2]],
  ])('lists open changes for the %s filter', async (filter, numbers) => {
    await connect();
    const { workspace } = await addClone();

    const [project] = await call(appRouter.codeHosts.inbox, { filter });

    expect(project).toEqual(
      expect.objectContaining({ workspaceId: workspace.id, project: 'group/project', error: null }),
    );
    expect(project?.changes.map((change) => change.number)).toEqual(numbers);
  });

  it('reports a failing host in its project without failing the inbox', async () => {
    await connect();
    await addClone();
    await codeHost.stop();

    const [project] = await call(appRouter.codeHosts.inbox, { filter: INBOX_FILTERS.all });

    expect(project?.changes).toEqual([]);
    expect(project?.error).toEqual(expect.any(String));
  });

  it.each([CODE_HOSTS.GITLAB, CODE_HOSTS.GITHUB])(
    'freezes a %s change against its target branch without touching the repository',
    async (host) => {
      await connect(host);
      const { clone, workspace } = await addClone(host === CODE_HOSTS.GITHUB ? 'owner/repo' : 'group/project');
      const refsBefore = clone.git('for-each-ref');

      const { snapshotId } = await call(appRouter.codeHosts.startChange, { workspaceId: workspace.id, number: 2 });
      const snapshot = await call(appRouter.reviews.snapshot, { snapshotId });

      expect(snapshot).toEqual(
        expect.objectContaining({
          branch: 'feature/backoff',
          parentBranch: 'feature/retry',
          kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST,
          change: expect.objectContaining({ host, number: 2, title: 'Back off' }),
        }),
      );
      expect(snapshot.files.map((file) => file.path)).toEqual(['src/backoff.ts']);
      expect(clone.git('for-each-ref')).toBe(refsBefore);
    },
  );

  it('reports new commits pushed to the change and takes them in on update', async () => {
    await connect();
    const { workspace } = await addClone();
    const { snapshotId, targetId } = await call(appRouter.codeHosts.startChange, {
      workspaceId: workspace.id,
      number: 1,
    });

    server.switch('feature/retry');
    server.commitFiles('Retry four times', { 'src/retry.ts': 'export const retries = 4;\n' });
    server.switch('main');
    codeHost.syncHead(1);

    const refreshed = await call(appRouter.reviews.refresh, { targetId });
    expect(refreshed.isNew).toBe(true);
    expect(refreshed.snapshotId).not.toBe(snapshotId);
    expect(await call(appRouter.reviews.liveStatus, { snapshotId: refreshed.snapshotId })).toEqual(
      expect.objectContaining({ newCommitCount: 0, isBranchRewritten: false }),
    );
  });

  it.each([CODE_HOSTS.GITLAB, CODE_HOSTS.GITHUB])('reads %s discussions as threads', async (host) => {
    await connect(host);
    const { workspace } = await addClone(host === CODE_HOSTS.GITHUB ? 'owner/repo' : 'group/project');
    codeHost.comments.set(1, [
      { id: 10, author: 'lead', body: 'Why three?', path: 'src/retry.ts', line: 1 },
      { id: 11, author: 'agent', body: 'The spec says so.', replyTo: 10 },
      { id: 12, author: 'lead', body: 'Looks fine overall.' },
    ]);
    const { snapshotId } = await call(appRouter.codeHosts.startChange, { workspaceId: workspace.id, number: 1 });

    const discussions = await call(appRouter.codeHosts.discussions, { snapshotId });

    expect(discussions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'src/retry.ts',
          newLine: 1,
          isOnSnapshot: true,
          notes: [
            expect.objectContaining({ authorName: 'lead', body: 'Why three?' }),
            expect.objectContaining({ authorName: 'agent', body: 'The spec says so.' }),
          ],
        }),
        expect.objectContaining({ notes: [expect.objectContaining({ body: 'Looks fine overall.' })] }),
      ]),
    );
  });

  it("moves a local branch's review onto the change it was pushed as", async () => {
    await connect();
    const { clone, workspace } = await addClone();
    clone.git('branch', 'feature/retry', 'origin/feature/retry');
    const local = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature/retry',
      parentBranch: 'main',
    });

    await call(appRouter.codeHosts.linkChange, { targetId: local.targetId, number: 1 });

    const [target] = await call(appRouter.reviews.list, { workspaceId: workspace.id });
    expect(target).toEqual(
      expect.objectContaining({
        id: local.targetId,
        kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST,
        change: expect.objectContaining({ number: 1 }),
        latestSnapshot: expect.objectContaining({ id: local.snapshotId }),
      }),
    );
    expect(await call(appRouter.codeHosts.startChange, { workspaceId: workspace.id, number: 1 })).toEqual({
      targetId: local.targetId,
      snapshotId: local.snapshotId,
    });
    await expectORPCError(call(appRouter.codeHosts.linkChange, { targetId: local.targetId, number: 1 }), {
      code: errorCodes.CHANGE_REQUEST_ALREADY_LINKED,
    });
  });

  describe('posting findings', () => {
    it('creates one GitLab draft note per finding, on the changed line when there is one, and only once', async () => {
      const { workspace, concern, note, selection } = await reviewWithFindings(CODE_HOSTS.GITLAB);
      const head = server.git('rev-parse', 'feature/backoff');

      const preview = await call(appRouter.exports.postingPreview, selection);
      expect(preview.items).toEqual([
        expect.objectContaining({ number: concern.number, path: 'src/backoff.ts', line: 1, isPosted: false }),
        expect.objectContaining({ number: note.number, line: undefined, isPosted: false }),
      ]);
      expect(preview.cliCommand).toContain("glab api --hostname '127.0.0.1:");
      expect(preview.curlCommand).toContain('PRIVATE-TOKEN: $GITLAB_TOKEN');
      expect(`${preview.cliCommand}${preview.curlCommand}`).not.toContain(GOOD_TOKEN);
      expect(codeHost.posts).toEqual([]);

      expect(await call(appRouter.exports.post, selection)).toEqual(expect.objectContaining({ postedCount: 2 }));
      expect(codeHost.posts.map((post) => post.body)).toEqual([
        {
          note: `Cap the backoff\n\n_Chaff F-${concern.number} · Concern_`,
          position: {
            position_type: 'text',
            base_sha: server.git('merge-base', 'feature/retry', head),
            start_sha: server.git('rev-parse', 'feature/retry'),
            head_sha: head,
            old_path: 'src/backoff.ts',
            new_path: 'src/backoff.ts',
            new_line: 1,
          },
        },
        { note: `Nice and small\n\n_Chaff F-${note.number} · Note_` },
      ]);
      expect(codeHost.posts.every((post) => post.path.endsWith('/merge_requests/2/draft_notes'))).toBe(true);
      const findings = await call(appRouter.findings.list, { workspaceId: workspace.id });
      expect(findings.every((finding) => finding.post?.host === CODE_HOSTS.GITLAB)).toBe(true);
      await expectORPCError(call(appRouter.exports.post, selection), { code: errorCodes.NOTHING_TO_POST });
    });

    it('puts every finding in one pending GitHub review that is never submitted', async () => {
      const { concern, note, selection } = await reviewWithFindings(CODE_HOSTS.GITHUB);

      const posted = await call(appRouter.exports.post, selection);

      expect(posted).toEqual({ postedCount: 2, url: expect.stringContaining('#pullrequestreview-1') });
      expect(codeHost.posts).toEqual([
        {
          path: '/api/v3/repos/owner/repo/pulls/2/reviews',
          body: {
            commit_id: server.git('rev-parse', 'feature/backoff'),
            body: `Nice and small\n\n_Chaff F-${note.number} · Note_`,
            comments: [
              {
                path: 'src/backoff.ts',
                line: 1,
                side: 'RIGHT',
                body: `Cap the backoff\n\n_Chaff F-${concern.number} · Concern_`,
              },
            ],
          },
        },
      ]);
    });

    it('records nothing when the host refuses the post', async () => {
      const { workspace, selection } = await reviewWithFindings(CODE_HOSTS.GITHUB);
      codeHost.hasPendingReview = true;
      await expectORPCError(call(appRouter.exports.post, selection), { code: errorCodes.REVIEW_ALREADY_PENDING });

      codeHost.hasPendingReview = false;
      codeHost.isReadOnly = true;
      await expectORPCError(call(appRouter.exports.post, selection), { code: errorCodes.CODE_HOST_WRITE_REJECTED });

      const findings = await call(appRouter.findings.list, { workspaceId: workspace.id });
      expect(findings.map((finding) => finding.post)).toEqual([undefined, undefined]);
      expect(findings.map((finding) => finding.status)).toEqual([FINDING_STATUSES.OPEN, FINDING_STATUSES.OPEN]);
    });
  });
});
