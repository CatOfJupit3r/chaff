import { Kbd } from '@~/components/ui/kbd';

const HINTS = [
  { keys: ['J', 'K'], label: 'next, previous' },
  { keys: ['V'], label: 'verify' },
  { keys: ['R'], label: 'reopen' },
  { keys: ['X'], label: 'close' },
  { keys: ['W'], label: 'withdraw' },
];

export function VerifyHints() {
  return (
    <div className="flex flex-wrap justify-center gap-[18px] text-[12px] text-faint">
      {HINTS.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          {hint.keys.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
          {hint.label}
        </span>
      ))}
    </div>
  );
}
