import { describe, expect, it } from 'vitest';

import { parseAgentReport, reportedNumber } from '@~/features/findings/agent-report.utils';

const ITEM = { id: 'F-3', status: 'fix_proposed', note: 'Capped it' };

describe('parseAgentReport', () => {
  it('reads a bare list, a wrapped list or a single item', () => {
    expect(parseAgentReport(JSON.stringify([ITEM]))).toEqual([ITEM]);
    expect(parseAgentReport(JSON.stringify({ findings: [ITEM] }))).toEqual([ITEM]);
    expect(parseAgentReport(JSON.stringify({ report: [ITEM] }))).toEqual([ITEM]);
    expect(parseAgentReport(JSON.stringify(ITEM))).toEqual([ITEM]);
  });

  it('finds the report in a reply, preferring the last fenced block', () => {
    const reply = [
      'I changed two files.',
      '```json',
      '[{ "id": "F-1", "status": "fix_proposed" }]',
      '```',
      'Correction:',
      '```json',
      JSON.stringify([ITEM]),
      '```',
    ].join('\n');
    expect(parseAgentReport(reply)).toEqual([ITEM]);
    expect(parseAgentReport(`Report: ${JSON.stringify([ITEM])} (end)`)).toEqual([ITEM]);
  });

  it('refuses text without a report and items without an id', () => {
    expect(parseAgentReport('Everything is fixed.')).toBeUndefined();
    expect(parseAgentReport(JSON.stringify([{ status: 'fix_proposed' }]))).toBeUndefined();
  });
});

describe('reportedNumber', () => {
  it('accepts the ways agents write finding ids', () => {
    expect(['F-12', 'f12', '12', '#12'].map(reportedNumber)).toEqual([12, 12, 12, 12]);
    expect(reportedNumber(12)).toBe(12);
    expect(reportedNumber('R-12')).toBeUndefined();
  });
});
