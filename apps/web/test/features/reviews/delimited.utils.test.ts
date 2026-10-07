import { describe, expect, it } from 'vitest';

import { parseDelimited, unmatchedRows } from '@~/features/reviews/delimited.utils';

describe('parseDelimited', () => {
  it('splits rows and fields, keeping quoted delimiters, quotes and line breaks inside a field', () => {
    const text = 'name,note\r\n"Smith, J","said ""hi""\nthen left"\nAda,\n';

    expect(parseDelimited(text, ',')).toEqual([
      ['name', 'note'],
      ['Smith, J', 'said "hi"\nthen left'],
      ['Ada', ''],
    ]);
  });

  it('reads tab-separated text and a last row without a line break', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('unmatchedRows', () => {
  it('finds rows the other version lacks, matching repeated rows once each', () => {
    const before = [['id'], ['1'], ['2'], ['2']];
    const after = [['id'], ['2'], ['3'], ['1']];

    expect([...unmatchedRows(before, after)]).toEqual([3]);
    expect([...unmatchedRows(after, before)]).toEqual([2]);
  });
});
