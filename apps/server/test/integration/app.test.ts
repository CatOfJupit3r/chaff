import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { appRouter, TEST_APP_VERSION, testDataDir } from '../helpers/instance';

describe('app info', () => {
  it('reports the app version, data folder and installed git', async () => {
    const info = await call(appRouter.app.info, undefined);

    expect(info).toMatchObject({ version: TEST_APP_VERSION, dataDir: testDataDir, platform: process.platform });
    expect(info.gitVersion).toMatch(/^\d+\.\d+/);
  });
});
