import { useState } from 'react';

import { MAX_AUTHOR_EMAILS } from '@chaff/common/constants/author-emails.constants';
import { authorEmailsSchema } from '@chaff/server-contract/contract/settings.contract';

import { Button } from '@~/components/ui/button';
import { List, ListRow } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';
import { TextInput } from '@~/components/ui/text-input';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';

/** Emails whose commits count as the user's, besides the git user each repository is configured with. */
export function AuthorEmailsSection() {
  const { authorEmails } = useSettings();
  const updateSettings = useUpdateSettings();
  const [draft, setDraft] = useState('');
  const parsed = authorEmailsSchema.element.safeParse(draft);
  const canAdd = parsed.success && !authorEmails.includes(parsed.data) && authorEmails.length < MAX_AUTHOR_EMAILS;

  const add = () => {
    if (!canAdd) return;
    updateSettings.mutate({ authorEmails: [...authorEmails, parsed.data] }, { onSuccess: () => setDraft('') });
  };
  const remove = (email: string) =>
    updateSettings.mutate({ authorEmails: authorEmails.filter((candidate) => candidate !== email) });

  return (
    <section aria-label="My emails" className="flex flex-col gap-2.5">
      <SectionLabel>My emails</SectionLabel>
      <p className="m-0 text-[12.5px] text-muted">
        Commits by these emails count as yours, as do those by the git user each repository is set up with. Add the ones
        you commit with elsewhere, such as a personal or a GitHub noreply address.
      </p>
      <List>
        {authorEmails.map((email) => (
          <ListRow key={email}>
            <span className="truncate font-mono text-[12.5px] text-fg">{email}</span>
            <Button size="sm" disabled={updateSettings.isPending} onClick={() => remove(email)}>
              Remove
            </Button>
          </ListRow>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <ListRow>
            <TextInput
              type="email"
              aria-label="Email to add"
              placeholder="you@example.com"
              value={draft}
              spellCheck={false}
              className="max-w-[520px] font-mono text-[12.5px]"
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" size="sm" disabled={!canAdd || updateSettings.isPending}>
              Add
            </Button>
          </ListRow>
        </form>
      </List>
    </section>
  );
}
