import 'reflect-metadata';
import { container } from 'tsyringe';
import { afterEach } from 'vitest';

import { DatabaseService } from '@~/db/database.service';

import { removeTempDirectories } from './git-repo';
import { fakeHost } from './instance';
import './matchers';

afterEach(() => {
  container.resolve(DatabaseService).clearAllTables();
  fakeHost.reset();
  removeTempDirectories();
});
