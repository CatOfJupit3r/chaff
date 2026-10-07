import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { showToast } from '@~/components/toast/toast-store';
import { useChangeActions } from '@~/features/code-hosts/hooks/use-change-actions';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import { useStackActions } from '@~/features/stacks/hooks/use-stack-actions';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { parseReviewLink } from '../review-link.utils';
import type { iWorkspace } from '../workspaces.types';

/**
 * Starts a review from a pasted merge request link, a `!412` / `#412` number, or a branch name. A branch is
 * reviewed against the branch it merges into in its stack; a branch in no stack starts one on the Stack screen.
 */
export function useOpenReviewLink(workspaces: readonly iWorkspace[]) {
  const available = workspaces.filter((workspace) => workspace.isAvailable);
  const remotes = useQueries({
    queries: available.map((workspace) =>
      tanstackRPC.codeHosts.workspaceRemote.queryOptions({ input: { workspaceId: workspace.id } }),
    ),
    combine: (results) =>
      results.flatMap((result, index) =>
        result.data && available[index] ? [{ workspace: available[index], project: result.data.project }] : [],
      ),
  });
  const branches = useQueries({
    queries: available.map((workspace) =>
      tanstackRPC.workspaces.branches.queryOptions({ input: { workspaceId: workspace.id } }),
    ),
    combine: (results) =>
      results.flatMap((result, index) =>
        (result.data ?? []).flatMap((branch) => (available[index] ? [{ workspace: available[index], branch }] : [])),
      ),
  });
  const stacks = useQueries({
    queries: available.map((workspace) =>
      tanstackRPC.stacks.list.queryOptions({ input: { workspaceId: workspace.id } }),
    ),
    combine: (results) => results.flatMap((result) => result.data ?? []),
  });
  const { start: startChange } = useChangeActions();
  const startReview = useStartReview();
  const { create: createStack } = useStackActions();
  const navigate = useNavigate();

  const open = (text: string) => {
    const link = parseReviewLink(text);
    if (!link) {
      showToast('Paste a merge request link, !412, #412 or a local branch name.');
      return;
    }
    if ('branch' in link) {
      const name = link.branch;
      const match = branches.find(({ branch }) => branch.name === name);
      if (!match) {
        showToast(`No repository here has a branch named ${name}.`);
        return;
      }
      const workspaceId = match.workspace.id;
      const stack = stacks.find(
        (candidate) =>
          candidate.workspaceId === workspaceId && candidate.branches.some((member) => member.branch === name),
      );
      const parentBranch = stack?.branches.find((member) => member.branch === name)?.parentBranch;
      if (parentBranch) {
        startReview.mutate({ workspaceId, branch: name, parentBranch });
        return;
      }
      const openStack = async (stackId: string) =>
        navigate({ to: '/stack', search: { workspace: workspaceId, stack: stackId, branch: name } });
      if (stack) {
        showToast(`Choose what ${name} merges into.`);
        void openStack(stack.id);
        return;
      }
      createStack.mutate(
        { workspaceId, branch: name },
        {
          onSuccess: async (created) => {
            showToast(`Started a stack from ${name}. Choose what it merges into.`);
            await openStack(created.id);
          },
        },
      );
      return;
    }
    const wanted = link.project?.toLowerCase();
    const candidates = wanted ? remotes.filter(({ project }) => project.toLowerCase() === wanted) : remotes;
    const [candidate] = candidates;
    if (!candidate) {
      showToast(
        link.project
          ? `No repository here is linked to ${link.project}. Add it, or link it in Settings.`
          : 'No repository here is linked to GitLab or GitHub yet.',
      );
      return;
    }
    if (candidates.length > 1) {
      showToast('Several repositories are linked to a project. Paste the full link instead.');
      return;
    }
    startChange.mutate({ workspaceId: candidate.workspace.id, number: link.number });
  };

  return { open, isOpening: startChange.isPending || startReview.isPending || createStack.isPending };
}
