import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { FolderIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { List } from '@~/components/ui/list';

interface iNoRepositoriesProps {
  onAdd: () => void;
  isAdding: boolean;
}

export function NoRepositories({ onAdd, isAdding }: iNoRepositoriesProps) {
  return (
    <List className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <FolderIcon className="size-6 text-faint" />
      <div>
        <p className="m-0 font-medium">Add a repository to start</p>
        <p className="m-0 mt-1 text-[13px] text-muted">
          Chaff reads its local branches straight from disk and never writes to it.
        </p>
      </div>
      <Button variant="primary" data-onboarding={ONBOARDING_ITEMS.ADD_REPOSITORY} onClick={onAdd} disabled={isAdding}>
        Add repository
      </Button>
    </List>
  );
}

export function NoLocalStacks() {
  return (
    <p className="m-0 px-4 py-3.5 text-[13px] text-muted">
      No local branches with commits of their own yet. Branches show up here as soon as they move past their parent.
    </p>
  );
}
