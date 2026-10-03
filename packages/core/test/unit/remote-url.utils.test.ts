import { describe, expect, it } from 'vitest';

import { parseRemoteUrl } from '@~/features/code-hosts/remote-url.utils';

describe('parseRemoteUrl', () => {
  it.each([
    ['git@gitlab.com:group/sub/project.git', 'gitlab.com', 'group/sub/project'],
    ['ssh://git@gitlab.example.com:2222/group/project.git', 'gitlab.example.com', 'group/project'],
    ['https://oauth2@GitHub.com/owner/repo.git', 'github.com', 'owner/repo'],
    ['https://gitlab.com/group/project/', 'gitlab.com', 'group/project'],
  ])('reads %s', (url, hostname, project) => {
    expect(parseRemoteUrl(url)).toEqual({ hostname, project });
  });

  it.each(['/home/me/repo', '../repo', 'file:///srv/repo.git', 'https://gitlab.com/project'])(
    'ignores %s, which names no hosted project',
    (url) => {
      expect(parseRemoteUrl(url)).toBeUndefined();
    },
  );
});
