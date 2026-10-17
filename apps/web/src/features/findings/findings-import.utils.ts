import z from 'zod';

import { findingsImportFileSchema } from '@chaff/server-contract/contract/findings.contract';

import type { iFindingsImportResult } from './findings.types';

/** The findings file's contents ready to import, or a message saying why it cannot be read. */
export function parseFindingsFile(content: string) {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return 'The file is not valid JSON.';
  }
  const parsed = findingsImportFileSchema.safeParse(json);
  return parsed.success
    ? parsed.data
    : `The file does not match the findings format:\n${z.prettifyError(parsed.error)}`;
}

function countOf(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** "Created 3 findings; 2 were imported before and were skipped." */
export function importSummaryLine({ created, existing }: Pick<iFindingsImportResult, 'created' | 'existing'>) {
  const createdPart = created.length > 0 ? `Created ${countOf(created.length, 'finding')}.` : 'No new findings.';
  if (existing.length === 0) return createdPart;
  return `${createdPart} Skipped ${countOf(existing.length, 'finding')} this review already has.`;
}
