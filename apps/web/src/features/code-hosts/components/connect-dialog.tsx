import { useState } from 'react';

import {
  CODE_HOST_DEFAULT_URLS,
  CODE_HOST_LABELS,
  CODE_HOSTS,
  codeHostValues,
} from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { Field } from '@~/components/ui/field';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { TextInput } from '@~/components/ui/text-input';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { TOKEN_SCOPE_HINTS } from '../code-hosts.enums';
import { useConnectionMutations } from '../hooks/use-connections';

interface iConnectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const HOST_OPTIONS = codeHostValues.map((value) => ({ value, label: CODE_HOST_LABELS(value) }));

export function ConnectDialog({ isOpen, onOpenChange }: iConnectDialogProps) {
  const { connect } = useConnectionMutations();
  const [host, setHost] = useState<CodeHost>(CODE_HOSTS.GITLAB);
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');

  const close = (isNextOpen: boolean) => {
    onOpenChange(isNextOpen);
    if (!isNextOpen) {
      setToken('');
      connect.reset();
    }
  };
  const submit = () =>
    connect.mutate({ host, baseUrl: baseUrl.trim() || undefined, token }, { onSuccess: () => close(false) });

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent>
        <DialogHeader
          title="Connect GitLab or GitHub"
          description="Chaff reads merge requests and their discussions. It never posts unless you ask it to."
        />
        <DialogBody>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <SegmentedControl label="Host" options={HOST_OPTIONS} value={host} onChange={setHost} />
            <Field label="Address" hint="Leave empty for the public site, or enter your self-managed instance.">
              <TextInput
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder={CODE_HOST_DEFAULT_URLS(host)}
                aria-label="Address"
                spellCheck={false}
              />
            </Field>
            <Field label="Token" hint={TOKEN_SCOPE_HINTS(host)}>
              <TextInput
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                aria-label="Token"
                autoComplete="off"
                required
              />
            </Field>
            <Callout>
              The token is checked with {CODE_HOST_LABELS(host)}, then kept encrypted in your system keychain. It never
              leaves this computer except to talk to {CODE_HOST_LABELS(host)}.
            </Callout>
            {connect.error ? <Callout variant="warn">{getErrorMessage(connect.error)}</Callout> : null}
            <DialogFooter>
              <Button type="button" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={token.trim() === '' || connect.isPending}>
                {connect.isPending ? 'Checking...' : 'Connect'}
              </Button>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
