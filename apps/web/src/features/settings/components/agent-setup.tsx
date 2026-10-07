import { useState } from 'react';

import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { CheckIcon, CopyIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { useCopyText } from '@~/hooks/use-copy-text';
import type { ORPCOutputs } from '@~/utils/orpc';

import { claudeAddCommand, codexConfig, mcpServersJson } from '../agent-setup.utils';
import type { iAgentBridge } from '../agent-setup.utils';
import { useAddToAgent } from '../hooks/use-agent-access';
import {
  AGENT_SETUP_TAB_LABELS,
  AGENT_SETUP_TABS,
  agentSetupTabsEnumwaii,
  agentSetupTabValues,
} from '../settings.enums';
import type { AgentSetupTab } from '../settings.enums';

type iAgentStatus = ORPCOutputs['agentAccess']['status']['agents'][number];

const SNIPPETS = agentSetupTabsEnumwaii.derive<(bridge: iAgentBridge) => string>()(
  [AGENT_SETUP_TABS.CLAUDE_CODE, claudeAddCommand],
  [AGENT_SETUP_TABS.CODEX, codexConfig],
  [AGENT_SETUP_TABS.OTHER, mcpServersJson],
);

const SNIPPET_HINTS = agentSetupTabsEnumwaii.derive(
  [AGENT_SETUP_TABS.CLAUDE_CODE, 'Run once in a terminal; it adds Chaff for every project.'],
  [AGENT_SETUP_TABS.CODEX, 'Add to ~/.codex/config.toml.'],
  [AGENT_SETUP_TABS.OTHER, 'For any MCP client that reads an mcpServers entry.'],
);

interface iAddButtonProps {
  agent: iAgentStatus | undefined;
  runner: DigestRunner;
}

/** Adds Chaff with the agent's own CLI, or says it is done or that the agent is not installed. */
function AddButton({ agent, runner }: iAddButtonProps) {
  const add = useAddToAgent();
  const label = DIGEST_RUNNER_LABELS.get(runner);
  if (!agent?.isAvailable) {
    return <span className="text-[12.5px] text-faint">{label} is not installed here. Copy the setup once it is.</span>;
  }
  if (agent.isAdded) {
    return (
      <Button size="sm" disabled>
        <CheckIcon />
        Added
      </Button>
    );
  }
  return (
    <Button variant="primary" size="sm" disabled={add.isPending} onClick={() => add.mutate({ runner })}>
      {add.isPending ? 'Adding…' : `Add to ${label}`}
    </Button>
  );
}

interface iAgentSetupProps {
  bridge: iAgentBridge;
  agents: readonly iAgentStatus[];
}

/** The setup for each agent, to copy or to add with one click. */
export function AgentSetup({ bridge, agents }: iAgentSetupProps) {
  const [tab, setTab] = useState<AgentSetupTab>(AGENT_SETUP_TABS.CLAUDE_CODE);
  const copyText = useCopyText();
  const snippet = SNIPPETS.get(tab)(bridge);
  const runner = agents.find((agent) => agent.runner === tab)?.runner;

  return (
    <div className="flex flex-col gap-2.5">
      <SegmentedControl
        label="Agent"
        options={agentSetupTabValues.map((value) => ({ value, label: AGENT_SETUP_TAB_LABELS.get(value) }))}
        value={tab}
        onChange={setTab}
        className="self-start"
      />
      <div className="relative rounded-md border border-line bg-canvas">
        <pre className="m-0 overflow-x-auto px-3.5 py-3 pr-24 font-mono text-code wrap-anywhere whitespace-pre-wrap text-fg">
          {snippet}
        </pre>
        <Button size="sm" className="absolute top-2 right-2" onClick={async () => copyText(snippet, 'Setup copied')}>
          <CopyIcon />
          Copy
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-auto text-[12.5px] text-muted">{SNIPPET_HINTS.get(tab)}</span>
        {runner ? <AddButton runner={runner} agent={agents.find((agent) => agent.runner === runner)} /> : null}
      </div>
    </div>
  );
}
