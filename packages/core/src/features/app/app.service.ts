import { inject, singleton } from 'tsyringe';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { GitService } from '@~/features/git/git.service';

@singleton()
export class AppService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly gitService: GitService,
  ) {}

  public async info() {
    return {
      version: this.options.appVersion,
      dataDir: this.options.dataDir,
      gitVersion: await this.gitService.version(),
      platform: process.platform,
    };
  }
}
