import { call } from '@orpc/server';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { createTempDirectory } from '../helpers/git-repo';
import { appRouter, fakeHost } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';

describe('host', () => {
  it('returns the folder picked in the native dialog', async () => {
    fakeHost.pickedDirectory = '/work/repo';

    await expect(call(appRouter.host.pickDirectory, { title: 'Add repository' })).resolves.toEqual({
      path: '/work/repo',
    });
    expect(fakeHost.pickerTitles).toEqual(['Add repository']);
  });

  it('returns null when the picker is cancelled', async () => {
    await expect(call(appRouter.host.pickDirectory, { title: 'Add repository' })).resolves.toEqual({ path: null });
  });

  it('returns the name and text of the file picked in the native dialog', async () => {
    const path = join(createTempDirectory(), 'findings.json');
    writeFileSync(path, '{ "findings": [] }');
    fakeHost.pickedFile = path;

    await expect(call(appRouter.host.openFile, { title: 'Import findings', extensions: ['json'] })).resolves.toEqual({
      file: { name: 'findings.json', content: '{ "findings": [] }' },
    });
    expect(fakeHost.pickerTitles).toEqual(['Import findings']);
  });

  it('returns no file when the file picker is cancelled', async () => {
    await expect(call(appRouter.host.openFile, { title: 'Import findings', extensions: ['json'] })).resolves.toEqual({
      file: null,
    });
  });

  it('refuses to open a file too large to read', async () => {
    const path = join(createTempDirectory(), 'huge.json');
    writeFileSync(path, Buffer.alloc(5_000_001));
    fakeHost.pickedFile = path;

    await expectORPCError(call(appRouter.host.openFile, { title: 'Import findings', extensions: ['json'] }), {
      code: errorCodes.FILE_TOO_LARGE,
    });
  });

  it.each(['https://gitlab.com/group/project/-/merge_requests/12', 'vscode://file/work/repo/src/app.ts:12:1'])(
    'opens %s outside Chaff',
    async (url) => {
      await expect(call(appRouter.host.openExternal, { url })).resolves.toEqual({ isOpened: true });
      expect(fakeHost.openedUrls).toEqual([url]);
    },
  );

  it.each(['http://example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'not a link'])(
    'refuses to open %s',
    async (url) => {
      await expectORPCError(call(appRouter.host.openExternal, { url }), { code: errorCodes.UNSUPPORTED_EXTERNAL_URL });
      expect(fakeHost.openedUrls).toEqual([]);
    },
  );
});
