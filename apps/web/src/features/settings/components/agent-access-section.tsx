import { SectionLabel } from '@~/components/ui/section-label';
import { Switch } from '@~/components/ui/switch';
import { formatRelativeTime } from '@~/utils/relative-time';

import { useAgentAccessStatus } from '../hooks/use-agent-access';
import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';
import { AgentSetup } from './agent-setup';

const SWITCH_LABEL_ID = 'agent-access-label';

/** Lets coding agents read and answer findings over MCP, with the setup for Claude Code, Codex and others. */
export function AgentAccessSection() {
  const { isAgentAccessEnabled } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const { data: status } = useAgentAccessStatus();
  const connection = status?.lastConnection;

  return (
    <section aria-label="Agent access" className="flex flex-col gap-2.5">
      <SectionLabel>Agent access</SectionLabel>
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span id={SWITCH_LABEL_ID} className="text-[14px] text-fg">
              Let coding agents read and answer findings
            </span>
            <span className="flex items-center gap-2 text-[12.5px] text-muted">
              {connection ? (
                <>
                  <span aria-hidden="true" className="size-2 rounded-full bg-good" />
                  {connection.clientName} connected · {formatRelativeTime(connection.connectedAt)}
                </>
              ) : (
                'No agent has connected since Chaff started.'
              )}
            </span>
          </div>
          <Switch
            aria-labelledby={SWITCH_LABEL_ID}
            isOn={isAgentAccessEnabled}
            onChange={(isOn) => updateSettings({ isAgentAccessEnabled: isOn })}
          />
        </div>
        {status?.bridge ? <AgentSetup bridge={status.bridge} agents={status.agents} /> : null}
        <p className="m-0 text-[12.5px] text-faint">
          Chaff picks the repository and branch from where the agent runs. It works while Chaff is open; agents can
          propose fixes, answer and reopen, and only you verify.
        </p>
      </div>
    </section>
  );
}
