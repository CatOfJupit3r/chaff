import { digestRunnerValues } from '@chaff/common/enums/digest.enums';

import { Callout } from '@~/components/ui/callout';
import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';
import { useDigestRunners } from '@~/features/digests/hooks/use-digest-runners';

import { AgentRow } from './agent-row';

/** Claude Code and Codex: where Chaff finds them, which one runs by default, and where the code goes. */
export function AgentsSection() {
  const { data: runners } = useDigestRunners(true);

  return (
    <section aria-label="Coding agents" className="flex flex-col gap-2.5">
      <SectionLabel>Coding agents</SectionLabel>
      <p className="m-0 text-[12.5px] text-muted">
        They write digests and fixes. Chaff looks for them on PATH; give a command or a full path when yours lives
        elsewhere.
      </p>
      <Callout>
        Chaff starts the agent with your own account. The code it reads, your findings and your preferences go to
        Anthropic for Claude Code or OpenAI for Codex, under that account&apos;s terms. Chaff itself sends nothing
        anywhere.
      </Callout>
      <List>
        {digestRunnerValues.map((runner) => (
          <AgentRow key={runner} runner={runner} status={runners?.find((candidate) => candidate.runner === runner)} />
        ))}
      </List>
    </section>
  );
}
