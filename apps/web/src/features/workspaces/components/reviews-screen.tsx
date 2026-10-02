import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { ChangeRequestsGroup } from '@~/features/code-hosts/components/change-requests-group';
import { pluralize } from '@~/utils/pluralize';

import { useAddWorkspace } from '../hooks/use-add-workspace';
import { useWorkspaces } from '../hooks/use-workspaces';
import { NoRepositories } from './empty-components';
import { LocalStacksGroup } from './local-stacks-group';
import { RepositoriesGroup } from './repositories-group';

export function ReviewsScreen() {
  const workspaces = useWorkspaces();
  const { addFromPicker, isAdding } = useAddWorkspace();

  return (
    <>
      <TopBar>
        <b className="font-medium text-fg">Reviews</b>
      </TopBar>
      <Screen>
        <div className="mx-auto flex max-w-[980px] flex-col gap-7">
          <div>
            <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em] text-balance">Reviews</h1>
            <p className="m-0 mt-1 text-muted">
              {workspaces.length > 0
                ? `${pluralize(workspaces.length, 'repository', 'repositories')} on this computer · read from disk, never written to`
                : 'Local branches from repositories on this computer'}
            </p>
          </div>
          {workspaces.length === 0 ? (
            <NoRepositories onAdd={addFromPicker} isAdding={isAdding} />
          ) : (
            <>
              <ChangeRequestsGroup workspaces={workspaces} />
              <LocalStacksGroup workspaces={workspaces} />
              <RepositoriesGroup workspaces={workspaces} onAdd={addFromPicker} isAdding={isAdding} />
            </>
          )}
        </div>
      </Screen>
    </>
  );
}
