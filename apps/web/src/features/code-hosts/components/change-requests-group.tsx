import { Link } from '@tanstack/react-router';

import { CODE_HOST_LABELS, INBOX_FILTER_LABELS, inboxFilterValues } from '@chaff/common/enums/code-host.enums';

import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { useReviewTargets } from '@~/features/reviews/hooks/use-review-targets';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';

import type { iInboxProject } from '../code-hosts.types';
import { groupChangeStacks } from '../code-hosts.utils';
import { useInbox } from '../hooks/use-inbox';
import { ChangeRow } from './change-row';

const FILTER_OPTIONS = inboxFilterValues.map((value) => ({ value, label: INBOX_FILTER_LABELS(value) }));

function ProjectChanges({ project, workspaceName }: { project: iInboxProject; workspaceName: string }) {
  const targets = useReviewTargets();
  const stacks = groupChangeStacks(project.changes);

  return (
    <div data-onboarding-hosted-stack={`${project.workspaceId}:${project.project}`} className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-muted">
        {workspaceName} · {CODE_HOST_LABELS(project.host)} <span className="font-mono">{project.project}</span>
      </span>
      <List>
        {project.error ? <p className="m-0 px-4 py-3.5 text-[13px] text-bad">{project.error}</p> : null}
        {stacks.flatMap((stack) =>
          stack.map((change, index) => (
            <ChangeRow
              key={change.number}
              project={project}
              change={change}
              below={stack[index - 1]}
              targets={targets}
            />
          )),
        )}
        {!project.error && project.changes.length === 0 ? (
          <p className="m-0 px-4 py-3.5 text-[13px] text-muted">Nothing open for this filter.</p>
        ) : null}
      </List>
    </div>
  );
}

/** Open merge requests and pull requests, stacked when one targets another's branch. */
export function ChangeRequestsGroup({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  const { hasConnections, projects, isLoading, filter, setFilter } = useInbox();
  const nameOf = (workspaceId: string) =>
    workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? 'Repository';

  return (
    <section aria-label="Merge requests" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Merge requests</SectionLabel>
        {hasConnections ? (
          <SegmentedControl label="Show merge requests" options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        ) : null}
      </div>
      {!hasConnections ? (
        <List>
          <p className="m-0 px-4 py-3.5 text-[13px] text-muted">
            <Link to="/settings" className="text-accent hover:underline">
              Connect GitLab or GitHub
            </Link>{' '}
            to review merge requests and pull requests next to your local branches.
          </p>
        </List>
      ) : null}
      {isLoading ? (
        <List>
          <p className="m-0 px-4 py-3.5 text-[13px] text-muted">Loading merge requests...</p>
        </List>
      ) : null}
      {hasConnections && !isLoading && projects.length === 0 ? (
        <List>
          <p className="m-0 px-4 py-3.5 text-[13px] text-muted">
            No repository is linked to a project yet. Chaff matches remotes to your connections, or you can pick a
            project in{' '}
            <Link to="/settings" className="text-accent hover:underline">
              Settings
            </Link>
            .
          </p>
        </List>
      ) : null}
      {projects.map((project) => (
        <ProjectChanges
          key={`${project.workspaceId}:${project.project}`}
          project={project}
          workspaceName={nameOf(project.workspaceId)}
        />
      ))}
    </section>
  );
}
