import { useState } from 'react';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { useDigestRunners } from './use-digest-runners';

/** The agent to run: the one picked, else the default from settings when installed, else the first installed one. */
export function useRunnerChoice(isOpen: boolean) {
  const { digestRunner } = useSettings();
  const [picked, setPicked] = useState<DigestRunner>();
  const { data: runners, isPending } = useDigestRunners(isOpen);
  const firstAvailable = runners?.find((runner) => runner.isAvailable)?.runner;
  const isDefaultAvailable = runners?.some((runner) => runner.runner === digestRunner && runner.isAvailable);
  const runner = picked ?? (isDefaultAvailable ? digestRunner : (firstAvailable ?? digestRunner));
  const isRunnerAvailable = runners?.some((candidate) => candidate.runner === runner && candidate.isAvailable) ?? false;
  return { runners: runners ?? [], isPending, runner, setPicked, isRunnerAvailable };
}
