import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { OverviewWorkspace } from '@~/features/overview/components/overview-workspace';

import { useAddWorkspace } from '../hooks/use-add-workspace';
import { useWorkspaces } from '../hooks/use-workspaces';
import { NoRepositories } from './empty-components';

export function ReviewsScreen() {
  const workspaces = useWorkspaces();
  const { addFromPicker, isAdding } = useAddWorkspace();

  return (
    <>
      <TopBar>
        <b className="font-medium text-fg">Overview</b>
      </TopBar>
      {workspaces.length === 0 ? (
        <Screen>
          <NoRepositories onAdd={addFromPicker} isAdding={isAdding} />
        </Screen>
      ) : (
        <OverviewWorkspace workspaces={workspaces} />
      )}
    </>
  );
}
