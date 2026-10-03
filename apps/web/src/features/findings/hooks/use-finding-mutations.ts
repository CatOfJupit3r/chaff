import { useMutation, useQueryClient } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Writing and deleting findings; both refresh every finding list. Errors are left to the caller. */
export function useFindingMutations() {
  const queryClient = useQueryClient();
  const onSuccess = async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() });

  const create = useMutation(tanstackRPC.findings.create.mutationOptions({ onSuccess }));
  const remove = useMutation(tanstackRPC.findings.remove.mutationOptions({ onSuccess }));
  return { create, remove };
}
