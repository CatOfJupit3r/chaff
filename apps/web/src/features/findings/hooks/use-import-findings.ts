import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { parseFindingsFile } from '../findings-import.utils';
import type { iFindingsImportOutcome } from '../findings.types';

const PICKER_TITLE = 'Import findings';
const FINDINGS_FILE_EXTENSIONS = ['json'];

/** Picks a findings file with the native dialog and imports it into the snapshot, keeping how it went. */
export function useImportFindings(snapshotId: string) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<iFindingsImportOutcome>();
  const openFile = useMutation(tanstackRPC.host.openFile.mutationOptions());
  const importFindings = useMutation(
    tanstackRPC.findings.importFindings.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() });
      },
    }),
  );

  const pickAndImport = async () => {
    const { file } = await openFile.mutateAsync({ title: PICKER_TITLE, extensions: FINDINGS_FILE_EXTENSIONS });
    if (!file) return;
    const parsed = parseFindingsFile(file.content);
    if (typeof parsed === 'string') {
      setOutcome({ fileName: file.name, message: parsed });
      return;
    }
    try {
      const result = await importFindings.mutateAsync({ snapshotId, file: parsed });
      setOutcome({ fileName: file.name, result });
    } catch (error) {
      setOutcome({ fileName: file.name, message: getErrorMessage(error) });
    }
  };

  const importFromPicker = () => {
    void pickAndImport().catch((error: unknown) => setOutcome({ message: getErrorMessage(error) }));
  };

  return {
    importFromPicker,
    isImporting: openFile.isPending || importFindings.isPending,
    outcome,
    dismiss: () => setOutcome(undefined),
  };
}
