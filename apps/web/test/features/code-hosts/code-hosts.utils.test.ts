import { describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';

import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import { changeLabel, discussionsInRange, tokenPageLinks } from '@~/features/code-hosts/code-hosts.utils';

function discussion(id: string, path: string, newLine?: number): iDiscussion {
  return { id, path, newLine, isResolved: false, isOnSnapshot: true, notes: [] };
}

describe('changeLabel', () => {
  it('writes the number the way each host does', () => {
    expect(changeLabel(CODE_HOSTS.GITLAB, 412)).toBe('!412');
    expect(changeLabel(CODE_HOSTS.GITHUB, 412)).toBe('#412');
  });
});

describe('discussionsInRange', () => {
  it("keeps the threads on the file's lines inside the range", () => {
    const threads = [
      discussion('in', 'src/a.ts', 4),
      discussion('after', 'src/a.ts', 9),
      discussion('other file', 'src/b.ts', 4),
      discussion('old side', 'src/a.ts'),
    ];

    expect(discussionsInRange(threads, 'src/a.ts', 2, 6).map((thread) => thread.id)).toEqual(['in']);
    expect(discussionsInRange(threads, 'src/a.ts', undefined, 6)).toEqual([]);
  });
});

describe('tokenPageLinks', () => {
  it("opens GitLab's fine-grained token page, on a self-managed instance too, without filling it in", () => {
    const [gitlabCom, ...rest] = tokenPageLinks(CODE_HOSTS.GITLAB, '');
    const [selfManaged] = tokenPageLinks(CODE_HOSTS.GITLAB, 'https://git.example.com/gitlab/');

    expect(rest).toEqual([]);
    expect(gitlabCom?.url).toBe('https://gitlab.com/-/user_settings/personal_access_tokens/granular/new');
    expect(selfManaged?.url).toBe('https://git.example.com/gitlab/-/user_settings/personal_access_tokens/granular/new');
  });

  it("opens GitHub's fine-grained token page filled in with read or write access to pull requests", () => {
    const links = tokenPageLinks(CODE_HOSTS.GITHUB, '');
    const [read, post] = links.map((link) => new URL(link.url ?? ''));

    expect(links.map((link) => link.isPrimary)).toEqual([true, false]);
    expect(`${read?.origin}${read?.pathname}`).toBe('https://github.com/settings/personal-access-tokens/new');
    expect(Object.fromEntries(read?.searchParams ?? [])).toMatchObject({
      name: 'Chaff',
      contents: 'read',
      pull_requests: 'read',
    });
    expect(post?.searchParams.get('pull_requests')).toBe('write');
  });

  it('has no link while the address is not a URL', () => {
    expect(tokenPageLinks(CODE_HOSTS.GITLAB, 'gitlab.exam').map((link) => link.url)).toEqual([undefined]);
    expect(tokenPageLinks(CODE_HOSTS.GITHUB, 'github.exam').map((link) => link.url)).toEqual([undefined, undefined]);
  });
});
