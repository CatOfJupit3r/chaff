import { describe, expect, it } from 'vitest';

import { createTrustedUrlCheck } from '../../src/main/trusted-origin';

describe('createTrustedUrlCheck', () => {
  it('trusts every page of the packaged renderer and nothing else', () => {
    const isTrustedUrl = createTrustedUrlCheck('chaff://app/');

    expect(isTrustedUrl('chaff://app/')).toBe(true);
    expect(isTrustedUrl('chaff://app/reviews/42?file=src%2Fapp.ts')).toBe(true);
    expect(isTrustedUrl('chaff://other/')).toBe(false);
    expect(isTrustedUrl('https://app/')).toBe(false);
  });

  it.each(['about:blank', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'javascript:alert(1)', ''])(
    'never trusts %j, whose URL origin is "null" like the custom scheme',
    (url) => {
      expect(createTrustedUrlCheck('chaff://app/')(url)).toBe(false);
    },
  );

  it('trusts the dev server only on its own port', () => {
    const isTrustedUrl = createTrustedUrlCheck('http://localhost:3030');

    expect(isTrustedUrl('http://localhost:3030/settings')).toBe(true);
    expect(isTrustedUrl('http://localhost:3031/')).toBe(false);
    expect(isTrustedUrl('https://localhost:3030/')).toBe(false);
  });

  it('refuses to build a check for a URL without a host', () => {
    expect(() => createTrustedUrlCheck('about:blank')).toThrow();
  });
});
