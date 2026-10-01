import { describe, expect, it } from 'vitest';

import { EDITORS } from '@chaff/common/enums/editors.enums';

import { buildEditorFileUrl, joinRepoPath } from '@~/features/editor/editor-links';

describe('buildEditorFileUrl', () => {
  it('opens a POSIX path at the requested line', () => {
    expect(buildEditorFileUrl(EDITORS.VSCODE, '/home/me/chaff/src/app.ts', 12)).toBe(
      'vscode://file/home/me/chaff/src/app.ts:12:1',
    );
  });

  it('turns a Windows path into a rooted forward-slash path', () => {
    expect(buildEditorFileUrl(EDITORS.CURSOR, 'C:\\work\\chaff\\src\\app.ts')).toBe(
      'cursor://file/C:/work/chaff/src/app.ts:1:1',
    );
  });

  it('encodes characters that are not allowed in a URL', () => {
    expect(buildEditorFileUrl(EDITORS.VSCODE_INSIDERS, '/Users/me/My Repos/chaff/a b.ts', 3)).toBe(
      'vscode-insiders://file/Users/me/My%20Repos/chaff/a%20b.ts:3:1',
    );
  });
});

describe('joinRepoPath', () => {
  it('joins with exactly one separator', () => {
    expect(joinRepoPath('/home/me/chaff/', '/src/app.ts')).toBe('/home/me/chaff/src/app.ts');
    expect(joinRepoPath('C:\\work\\chaff\\', 'src/app.ts')).toBe('C:\\work\\chaff/src/app.ts');
  });
});
