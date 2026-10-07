import type { ReactNode } from 'react';

import { CODE_HOST_LABELS, CODE_HOSTS, codeHostsEnumwaii } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import { Button } from '@~/components/ui/button';

import { TOKEN_NAME } from '../code-hosts.constants';
import { tokenPageLinks } from '../code-hosts.utils';
import { useOpenLink } from '../hooks/use-open-link';

interface iTokenInstructionsProps {
  host: CodeHost;
  /** Instance address as typed; the public site when empty. */
  address: string;
}

/** A label exactly as the host's own page shows it. */
function UiLabel({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-fg">{children}</strong>;
}

function GitLabSteps() {
  return (
    <>
      <li>
        Open the token page with the button below. It is <UiLabel>Edit profile</UiLabel> &gt; <UiLabel>Access</UiLabel>{' '}
        &gt; <UiLabel>Personal access tokens</UiLabel> &gt; <UiLabel>Generate token</UiLabel> &gt;{' '}
        <UiLabel>Fine-grained token</UiLabel>, on GitLab 18.10 or later.
      </li>
      <li>
        Fill in <UiLabel>Name</UiLabel> (for example, {TOKEN_NAME}) and <UiLabel>Description</UiLabel>, which GitLab
        asks for, and choose an <UiLabel>Expiration date</UiLabel>.
      </li>
      <li>
        Under <UiLabel>Group and project access</UiLabel>, pick{' '}
        <UiLabel>All groups and projects I have access to</UiLabel> or{' '}
        <UiLabel>Only specific groups or projects I have access to</UiLabel>.
      </li>
      <li>
        Under <UiLabel>Add resource permissions</UiLabel>, on the <UiLabel>Group and project</UiLabel> tab, add{' '}
        <UiLabel>Project</UiLabel>, <UiLabel>Merge Request</UiLabel>, <UiLabel>Branch</UiLabel> and{' '}
        <UiLabel>Work Item</UiLabel> with <UiLabel>Read</UiLabel>, and <UiLabel>Code</UiLabel> with{' '}
        <UiLabel>Download</UiLabel>. Give Merge Request <UiLabel>Update</UiLabel> as well so Chaff can post draft notes.
      </li>
      <li>
        On the <UiLabel>User</UiLabel> tab, add <UiLabel>User</UiLabel> with <UiLabel>Read</UiLabel>.
      </li>
      <li>
        Press <UiLabel>Generate token</UiLabel>, then copy the token (it starts with <code>glpat-</code>). GitLab shows
        it only once.
      </li>
    </>
  );
}

function GitHubSteps() {
  return (
    <>
      <li>
        Open the token page with a button below. It is <UiLabel>Settings</UiLabel> &gt;{' '}
        <UiLabel>Developer settings</UiLabel> &gt; <UiLabel>Personal access tokens</UiLabel> &gt;{' '}
        <UiLabel>Fine-grained tokens</UiLabel> &gt; <UiLabel>Generate new token</UiLabel>, with the name and permissions
        already filled in.
      </li>
      <li>
        Under <UiLabel>Resource owner</UiLabel>, pick the account or organization that owns the repositories. An
        organization may have to approve the token before it works.
      </li>
      <li>
        Under <UiLabel>Repository access</UiLabel>, pick <UiLabel>All repositories</UiLabel> or{' '}
        <UiLabel>Only select repositories</UiLabel>.
      </li>
      <li>
        Under <UiLabel>Permissions</UiLabel>, check the repository permissions: <UiLabel>Contents</UiLabel> and{' '}
        <UiLabel>Pull requests</UiLabel> on <UiLabel>Read-only</UiLabel>, or Pull requests on{' '}
        <UiLabel>Read and write</UiLabel> so Chaff can post pending reviews. <UiLabel>Metadata</UiLabel> stays
        Read-only.
      </li>
      <li>
        Press <UiLabel>Generate token</UiLabel>, then copy the token (it starts with <code>github_pat_</code>). GitHub
        shows it only once.
      </li>
    </>
  );
}

const TOKEN_STEPS = codeHostsEnumwaii.derive<ReactNode>()(
  [CODE_HOSTS.GITLAB, <GitLabSteps key={CODE_HOSTS.GITLAB} />],
  [CODE_HOSTS.GITHUB, <GitHubSteps key={CODE_HOSTS.GITHUB} />],
);

/** How to make a fine-grained personal access token on the host, with links to its token page. */
export function TokenInstructions({ host, address }: iTokenInstructionsProps) {
  const openLink = useOpenLink();

  return (
    <div className="flex flex-col gap-2.5 rounded-sm border border-line bg-raised p-3 text-[12.5px] text-fg-soft">
      <span className="text-muted">Create a fine-grained personal access token on {CODE_HOST_LABELS.get(host)}</span>
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-4">{TOKEN_STEPS.get(host)}</ol>
      <div className="flex flex-wrap gap-2">
        {tokenPageLinks(host, address).map(({ label, url, isPrimary }) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={isPrimary ? 'default' : 'ghost'}
            disabled={!url}
            onClick={() => (url ? openLink(url) : null)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
