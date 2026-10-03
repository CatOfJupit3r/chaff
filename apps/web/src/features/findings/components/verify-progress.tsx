import type { iFinding } from '../findings.types';
import { countActive, countWaitingOnYou } from '../findings.utils';

/** "3 of 9 verified · 3 open · 2 waiting on you", with a bar split the same way. */
export function VerifyProgress({ findings, verifiedCount }: { findings: readonly iFinding[]; verifiedCount: number }) {
  const total = Math.max(findings.length, 1);
  const waiting = countWaitingOnYou(findings);
  const open = countActive(findings) - waiting;
  const segments = [
    { key: 'verified', value: verifiedCount, className: 'bg-good' },
    { key: 'waiting', value: waiting, className: 'bg-accent' },
    { key: 'open', value: open, className: 'bg-warn' },
  ];

  return (
    <div className="flex min-w-[240px] flex-col items-end gap-2">
      <p className="m-0 text-[13px] text-muted">
        <b className="font-medium text-fg">
          {verifiedCount} of {findings.length} verified
        </b>{' '}
        · {open} open · {waiting} waiting on you
      </p>
      <div className="flex h-[3px] w-full overflow-hidden rounded-full bg-raised" aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
