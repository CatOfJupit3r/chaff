import type { ReactNode } from 'react';

import { EXPORT_SCOPES, exportScopeValues } from '@chaff/common/enums/export.enums';

import { SectionLabel } from '@~/components/ui/section-label';
import { FINDING_FILTER_LABELS } from '@~/features/findings/findings.enums';
import type { FindingFilter } from '@~/features/findings/findings.enums';

import { countForFilter } from '../export.utils';
import { EXPORT_INCLUDE_FILTERS, EXPORT_SCOPE_LABELS } from '../exports.enums';
import type { iExportPacket } from '../exports.types';
import type { iExportOptions } from '../hooks/use-export-options';

const ROW_CLASS = 'flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] text-fg';
const INPUT_CLASS = 'size-3.5 accent-accent';

interface iOptionRowProps {
  type: 'radio' | 'checkbox';
  isChecked: boolean;
  onChange: () => unknown;
  children: ReactNode;
  count?: number;
}

function OptionRow({ type, isChecked, onChange, children, count }: iOptionRowProps) {
  return (
    <label className={ROW_CLASS}>
      <input
        type={type}
        name={type === 'radio' ? 'export-scope' : undefined}
        checked={isChecked}
        onChange={onChange}
        className={INPUT_CLASS}
      />
      <span className="flex-1">{children}</span>
      {count === undefined ? null : <span className="font-mono text-[12px] text-faint tabular-nums">{count}</span>}
    </label>
  );
}

interface iExportOptionsProps {
  options: iExportOptions;
  /** Names the review itself, such as `!41` or the branch. */
  reviewName: string;
  statusCounts: iExportPacket['statusCounts'];
  onUpdate: (change: Partial<iExportOptions>) => unknown;
  onToggle: (filter: FindingFilter) => unknown;
}

/** Scope, the status groups to include, and what to attach to each finding. */
export function ExportOptionsPanel({ options, reviewName, statusCounts, onUpdate, onToggle }: iExportOptionsProps) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 flex flex-col border-0 p-0">
        <SectionLabel className="mb-1.5">Scope</SectionLabel>
        {exportScopeValues.map((scope) => (
          <OptionRow key={scope} type="radio" isChecked={options.scope === scope} onChange={() => onUpdate({ scope })}>
            {EXPORT_SCOPE_LABELS.get(scope)}
            {scope === EXPORT_SCOPES.review ? (
              <span className="ml-1.5 font-mono text-[12px] text-muted">{reviewName}</span>
            ) : null}
          </OptionRow>
        ))}
      </fieldset>
      <fieldset className="m-0 flex flex-col border-0 p-0">
        <SectionLabel className="mb-1.5">Include</SectionLabel>
        {EXPORT_INCLUDE_FILTERS.map((filter) => (
          <OptionRow
            key={filter}
            type="checkbox"
            isChecked={options.filters.includes(filter)}
            onChange={() => onToggle(filter)}
            count={countForFilter(statusCounts, filter)}
          >
            {FINDING_FILTER_LABELS.get(filter)}
          </OptionRow>
        ))}
      </fieldset>
      <fieldset className="m-0 flex flex-col border-0 p-0">
        <SectionLabel className="mb-1.5">Attach</SectionLabel>
        <OptionRow
          type="checkbox"
          isChecked={options.shouldQuoteCode}
          onChange={() => onUpdate({ shouldQuoteCode: !options.shouldQuoteCode })}
        >
          Quoted code at the reviewed revision
        </OptionRow>
        <OptionRow
          type="checkbox"
          isChecked={options.shouldListUnreviewed}
          onChange={() => onUpdate({ shouldListUnreviewed: !options.shouldListUnreviewed })}
        >
          Units without a decision
        </OptionRow>
      </fieldset>
    </div>
  );
}
