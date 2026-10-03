import { useQueries } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { useChangeActions } from '@~/features/code-hosts/hooks/use-change-actions';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { parseReviewLink } from '../review-link.utils';
import type { iWorkspace } from '../workspaces.types';

/** Starts a review from a pasted merge request link, a `!412` / `#412` number, or a local branch name. */
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
  const { start: startChange } = useChangeActions();
  const startReview = useStartReview();

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
      if (!match.branch.parent) {
        showToast(`${name} has no parent yet. Pick one on the Stack screen.`);
        return;
      }
      startReview.mutate({ workspaceId: match.workspace.id, branch: name, parentBranch: match.branch.parent });
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

  return { open, isOpening: startChange.isPending || startReview.isPending };
}
