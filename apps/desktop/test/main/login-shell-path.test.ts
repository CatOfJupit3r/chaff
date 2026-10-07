import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { LoginShellPath } from '../../src/main/login-shell-path';

/** A shell whose profile prints a greeting and adds a folder to PATH, then runs the command it is given. */
function fakeShell(body: string) {
  const shell = path.join(mkdtempSync(path.join(tmpdir(), 'chaff-shell-')), 'shell');
  writeFileSync(shell, `#!/bin/sh\n${body}\n`);
  chmodSync(shell, 0o755);
  return shell;
}

describe.skipIf(process.platform === 'win32')('LoginShellPath', () => {
  it("puts the shell's PATH first and keeps the inherited folders it lacks", async () => {
    const shell = fakeShell(
      'echo "Welcome back"\nPATH="/home/me/.local/bin:/usr/bin:/bin"; export PATH\nexec /bin/sh -c "$2"',
    );
    const resolved = await new LoginShellPath(shell).resolve({ PATH: '/usr/bin:/bin:/usr/sbin' });

    expect(resolved).toBe('/home/me/.local/bin:/usr/bin:/bin:/usr/sbin');
  });

  it('keeps the inherited PATH when the shell fails', async () => {
    const resolved = await new LoginShellPath(fakeShell('exit 1')).resolve({ PATH: '/usr/bin:/bin' });

    expect(resolved).toBe('/usr/bin:/bin');
  });
});
