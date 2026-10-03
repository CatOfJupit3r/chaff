import { useMutation, useQueryClient } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Reads a coding agent's report back into the findings it names. */
export function useImportReport() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.findings.importReport.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
          queryClient.invalidateQueries({ queryKey: tanstackRPC.exports.key() }),
        ]);
      },
    }),
  );
}
