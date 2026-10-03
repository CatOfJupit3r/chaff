import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iChangeUnit } from '../change-units.types';
import { changeUnitsQueryOptions } from './use-change-units';

/** Edits to a snapshot's Change units. Each answers with the whole list, which replaces the cached one. */
export function useChangeUnitActions(snapshotId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = changeUnitsQueryOptions(snapshotId);
  const handlers = {
    onSuccess: (changes: iChangeUnit[]) => queryClient.setQueryData(queryKey, changes),
    onError: (error: Error) => showToast(getErrorMessage(error)),
  };

  return {
    create: useMutation(tanstackRPC.changeUnits.create.mutationOptions(handlers)),
    moveUnits: useMutation(tanstackRPC.changeUnits.moveUnits.mutationOptions(handlers)),
    merge: useMutation(tanstackRPC.changeUnits.merge.mutationOptions(handlers)),
    rename: useMutation(tanstackRPC.changeUnits.rename.mutationOptions(handlers)),
    reorder: useMutation(tanstackRPC.changeUnits.reorder.mutationOptions(handlers)),
    remove: useMutation(tanstackRPC.changeUnits.remove.mutationOptions(handlers)),
    adoptDigest: useMutation(tanstackRPC.changeUnits.useDigest.mutationOptions(handlers)),
  };
}
