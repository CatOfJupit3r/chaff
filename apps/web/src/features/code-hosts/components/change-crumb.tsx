import { ExternalIcon } from '@~/components/icons/icons';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';

import type { iChangeRequestInfo } from '../code-hosts.types';
import { changeLabel } from '../code-hosts.utils';
import { useOpenLink } from '../hooks/use-open-link';

/** The merge request a review reads, opening it on its host. */
export function ChangeCrumb({ change }: { change: iChangeRequestInfo }) {
  const openLink = useOpenLink();

  return (
    <button
      type="button"
      title={`Open ${changeLabel(change.host, change.number)} in the browser`}
      onClick={() => openLink(change.webUrl)}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-fg hover:bg-hover"
    >
      <span className="font-mono text-[12.5px] text-muted">{changeLabel(change.host, change.number)}</span>
      <MarkdownTitle text={change.title} className="max-w-[32ch] truncate text-[12.5px]" />
      <ExternalIcon className="size-3 text-faint" />
    </button>
  );
}
