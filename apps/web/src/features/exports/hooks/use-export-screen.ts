import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useSnapshot } from '@~/features/reviews/hooks/use-snapshot';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { statusesFor } from '../export.utils';
import { EXPORT_TABS } from '../exports.enums';
import type { ExportTab } from '../exports.enums';
import { useExportOptions } from './use-export-options';

/** The Export screen: the review, the chosen options, the packet they produce and the tab on show. */
export function useExportScreen(snapshotId: string) {
  const snapshot = useSnapshot(snapshotId);
  const workspace = useWorkspaces().find((candidate) => candidate.id === snapshot.workspaceId);
  const { options, update, toggle } = useExportOptions();
  const [tab, setTab] = useState<ExportTab>(EXPORT_TABS.markdown);
  const statuses = statusesFor(options.filters);
  const packet = useQuery({
    ...tanstackRPC.exports.packet.queryOptions({
      input: {
        snapshotId,
        scope: options.scope,
        statuses,
        shouldQuoteCode: options.shouldQuoteCode,
        shouldListUnreviewed: options.shouldListUnreviewed,
      },
    }),
    placeholderData: keepPreviousData,
  });

  return {
    snapshot,
    workspaceId: snapshot.workspaceId,
    repositoryName: workspace?.name ?? snapshot.branch,
    options,
    update,
    toggle,
    statuses,
    packet: packet.data,
    isLoading: packet.isLoading,
    tab,
    setTab,
  };
}
