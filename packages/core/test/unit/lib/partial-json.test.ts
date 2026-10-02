import { describe, expect, it } from 'vitest';

import { parsePartialJson } from '@~/lib/partial-json';

describe('parsePartialJson', () => {
  it('closes a string, array and object cut off mid-value', () => {
    expect(parsePartialJson('{"overview": "Backoff grows')).toEqual({ overview: 'Backoff grows' });
    expect(parsePartialJson('{"groups": [{"title": "Faster", "units": ["u1", "u')).toEqual({
      groups: [{ title: 'Faster', units: ['u1', 'u'] }],
    });
  });

  it('drops a member whose name or value has not arrived', () => {
    expect(parsePartialJson('{"overview": "Done", "gro')).toEqual({ overview: 'Done' });
    expect(parsePartialJson('{"overview": "Done", "groups":')).toEqual({ overview: 'Done' });
    expect(parsePartialJson('{"overview": "Done", "isSuggestion": tr')).toEqual({ overview: 'Done' });
  });

  it('keeps escapes intact and reads complete JSON as is', () => {
    expect(parsePartialJson('{"overview": "a \\"quoted\\" word\\')).toEqual({ overview: 'a "quoted" word' });
    expect(parsePartialJson('{"units": [], "diagrams": []}')).toEqual({ units: [], diagrams: [] });
  });

  it('returns undefined before anything usable', () => {
    expect(parsePartialJson('')).toBeUndefined();
  });
});
