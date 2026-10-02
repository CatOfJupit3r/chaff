import { call } from '@orpc/server';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ACCENTS, CODE_SIZES, THEME_MODES } from '@chaff/common/enums/appearance.enums';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { EDITORS } from '@chaff/common/enums/editors.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';

import { appRouter, fakeHost } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';

const FAKE_AGENT = fileURLToPath(new URL('../helpers/fake-agent/claude.mjs', import.meta.url));

describe('settings', () => {
  it('follows the system theme, opens files in VS Code and writes digests with Claude Code until changed', async () => {
    await expect(call(appRouter.settings.get, undefined)).resolves.toEqual({
      editor: EDITORS.VSCODE,
      theme: THEME_MODES.SYSTEM,
      accent: ACCENTS.DEFAULT,
      codeSize: CODE_SIZES.DEFAULT,
      digestRunner: DIGEST_RUNNERS.CLAUDE_CODE,
      agentCommands: [],
      shortcuts: [],
    });
  });

  it('keeps the settings an update leaves out', async () => {
    await call(appRouter.settings.update, { editor: EDITORS.CURSOR, accent: ACCENTS.TEAL });

    await call(appRouter.settings.update, { codeSize: CODE_SIZES.LARGE, digestRunner: DIGEST_RUNNERS.CODEX });

    await expect(call(appRouter.settings.get, undefined)).resolves.toEqual({
      editor: EDITORS.CURSOR,
      theme: THEME_MODES.SYSTEM,
      accent: ACCENTS.TEAL,
      codeSize: CODE_SIZES.LARGE,
      digestRunner: DIGEST_RUNNERS.CODEX,
      agentCommands: [],
      shortcuts: [],
    });
  });

  it('restyles the window only when the theme changes', async () => {
    await call(appRouter.settings.update, { theme: THEME_MODES.LIGHT });
    await call(appRouter.settings.update, { theme: THEME_MODES.LIGHT, accent: ACCENTS.VIOLET });
    await call(appRouter.settings.update, { theme: THEME_MODES.DARK });

    expect(fakeHost.appliedThemes).toEqual([THEME_MODES.LIGHT, THEME_MODES.DARK]);
  });

  it('finds a coding agent at the path set in settings', async () => {
    await call(appRouter.settings.update, {
      agentCommands: [{ runner: DIGEST_RUNNERS.CODEX, command: `  ${FAKE_AGENT}  ` }],
    });

    await expect(call(appRouter.digests.runners, undefined)).resolves.toEqual([
      expect.objectContaining({ runner: DIGEST_RUNNERS.CLAUDE_CODE, isAvailable: true }),
      { runner: DIGEST_RUNNERS.CODEX, command: FAKE_AGENT, isAvailable: true, path: FAKE_AGENT },
    ]);

    await call(appRouter.settings.update, {
      agentCommands: [{ runner: DIGEST_RUNNERS.CLAUDE_CODE, command: '/nowhere/claude' }],
    });
    await expect(call(appRouter.digests.runners, undefined)).resolves.toEqual([
      { runner: DIGEST_RUNNERS.CLAUDE_CODE, command: '/nowhere/claude', isAvailable: false },
      expect.objectContaining({ runner: DIGEST_RUNNERS.CODEX, isAvailable: false }),
    ]);
  });

  it('keeps rebound keys and refuses two actions on one screen sharing a key', async () => {
    const shortcuts = [
      { action: SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD, key: 'y' },
      // Verify is another screen, so the same key is fine there.
      { action: SHORTCUT_ACTIONS.VERIFY_VERIFY, key: 'y' },
    ];
    await call(appRouter.settings.update, { shortcuts });
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ shortcuts });

    await expectORPCError(
      call(appRouter.settings.update, { shortcuts: [{ action: SHORTCUT_ACTIONS.FOCUS_LATER, key: 'g' }] }),
      { code: errorCodes.SHORTCUT_CONFLICT },
    );
    await expectORPCError(
      call(appRouter.settings.update, { shortcuts: [{ action: SHORTCUT_ACTIONS.FOCUS_UNDO, key: '2' }] }),
      { code: errorCodes.SHORTCUT_CONFLICT },
    );
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ shortcuts });
  });
});
