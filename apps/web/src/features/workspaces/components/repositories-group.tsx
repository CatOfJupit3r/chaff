import { Button } from '@~/components/ui/button';
import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';

import type { iWorkspace } from '../workspaces.types';
import { RepositoryRow } from './repository-row';

interface iRepositoriesGroupProps {
  workspaces: readonly iWorkspace[];
  onAdd: () => void;
  isAdding: boolean;
}

export function RepositoriesGroup({ workspaces, onAdd, isAdding }: iRepositoriesGroupProps) {
  return (
    <section aria-label="Repositories" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Repositories</SectionLabel>
        <Button size="sm" onClick={onAdd} disabled={isAdding}>
          Add repository
        </Button>
      </div>
      <List>
        {workspaces.map((workspace) => (
          <RepositoryRow key={workspace.id} workspace={workspace} />
        ))}
      </List>
    </section>
  );
}
