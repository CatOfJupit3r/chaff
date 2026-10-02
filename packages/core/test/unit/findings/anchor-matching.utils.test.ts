import { describe, expect, it } from 'vitest';

import { ANCHOR_MATCHES } from '@chaff/common/enums/review.enums';

import { locateAnchor } from '@~/features/findings/anchor-matching.utils';
import type { iAnchorReference } from '@~/features/findings/anchor-matching.utils';

const FILE = [
  'import { a } from "a";',
  '',
  'function first() {',
  '  return a + 1;',
  '}',
  '',
  'function second() {',
  '  return a + 2;',
  '}',
];

/** The anchor on `first`'s body as it was written on FILE. */
const REFERENCE: iAnchorReference = {
  startLine: 4,
  lineCount: 1,
  text: '  return a + 1;',
  contextBefore: ['import { a } from "a";', '', 'function first() {'].join('\n'),
  contextAfter: ['}', '', 'function second() {'].join('\n'),
};

const contents = (lines: readonly string[]) => `${lines.join('\n')}\n`;

describe('locateAnchor', () => {
  it('finds the same lines after code above them moved', () => {
    const located = locateAnchor(contents(['// header', '', ...FILE]), REFERENCE);

    expect(located).toMatchObject({ match: ANCHOR_MATCHES.EXACT, startLine: 6, endLine: 6, text: '  return a + 1;' });
    expect(located.contextBefore).toBe(['import { a } from "a";', '', 'function first() {'].join('\n'));
  });

  it('prefers the copy whose context still agrees when the quote repeats', () => {
    const repeated = [...FILE.slice(0, 7), '  return a + 1;', '}'];

    expect(locateAnchor(contents(repeated), { ...REFERENCE, startLine: 8 })).toMatchObject({
      match: ANCHOR_MATCHES.EXACT,
      startLine: 4,
    });
  });

  it('takes whatever sits between the same context as changed code', () => {
    const edited = [...FILE.slice(0, 3), '  const b = a * 2;', '  return b;', ...FILE.slice(4)];

    expect(locateAnchor(contents(edited), REFERENCE)).toMatchObject({
      match: ANCHOR_MATCHES.CHANGED,
      startLine: 4,
      endLine: 5,
      text: '  const b = a * 2;\n  return b;',
    });
  });

  it('notes where removed lines were, with an end before the start', () => {
    const removed = [...FILE.slice(0, 3), ...FILE.slice(4)];

    expect(locateAnchor(contents(removed), REFERENCE)).toMatchObject({
      match: ANCHOR_MATCHES.CHANGED,
      startLine: 4,
      endLine: 3,
      text: '',
    });
  });

  it('finds a similar block next to one context block that survived', () => {
    const renamed = ['import { b } from "b";', '', 'function first() {', '  return a + 10;', '}', '// end'];

    expect(locateAnchor(contents(renamed), REFERENCE)).toMatchObject({
      match: ANCHOR_MATCHES.CHANGED,
      startLine: 4,
      text: '  return a + 10;',
    });
  });

  it('is unmatched rather than landing on unrelated code', () => {
    const unrelated = ['export const value = compute();', 'console.log(value);'];

    expect(locateAnchor(contents(unrelated), REFERENCE).match).toBe(ANCHOR_MATCHES.UNMATCHED);
    expect(locateAnchor(undefined, REFERENCE).match).toBe(ANCHOR_MATCHES.UNMATCHED);
  });

  it('keeps an anchor on a whole file as long as the file is there', () => {
    const wholeFile = { lineCount: 0, text: '', contextBefore: '', contextAfter: '' };

    const located = locateAnchor('binary', wholeFile);

    expect(located.match).toBe(ANCHOR_MATCHES.EXACT);
    expect(located.startLine).toBeUndefined();
  });
});
