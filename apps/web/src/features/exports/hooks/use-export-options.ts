import { useState } from 'react';

import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import type { ExportScope } from '@chaff/common/enums/export.enums';

import type { FindingFilter } from '@~/features/findings/findings.enums';

import { toggleFilter } from '../export.utils';
import { DEFAULT_EXPORT_FILTERS, EXPORT_INCLUDE_FILTERS } from '../exports.enums';

export interface iExportOptions {
  scope: ExportScope;
  filters: readonly FindingFilter[];
  shouldQuoteCode: boolean;
  shouldListUnreviewed: boolean;
}

/** What to export: the scope, which status groups, and what to attach. */
export function useExportOptions() {
  const [options, setOptions] = useState<iExportOptions>({
    scope: EXPORT_SCOPES.review,
    filters: DEFAULT_EXPORT_FILTERS,
    shouldQuoteCode: true,
    shouldListUnreviewed: false,
  });
  const update = (change: Partial<iExportOptions>) => setOptions((current) => ({ ...current, ...change }));
  const toggle = (filter: FindingFilter) =>
    setOptions((current) => ({ ...current, filters: toggleFilter(current.filters, filter, EXPORT_INCLUDE_FILTERS) }));
  return { options, update, toggle };
}
