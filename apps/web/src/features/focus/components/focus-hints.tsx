import { Kbd } from '@~/components/ui/kbd';

const HINTS = [
  { keys: ['←', '→'], label: 'move' },
  { keys: ['G'], label: 'looks good' },
  { keys: ['C'], label: 'concern' },
  { keys: ['Q'], label: 'question' },
  { keys: ['L'], label: 'later' },
  { keys: ['U'], label: 'undo' },
  { keys: ['1', '2'], label: 'code, usages' },
  { keys: ['I'], label: 'context' },
];

export function FocusHints() {
  return (
    <div className="mt-[18px] flex flex-wrap justify-center gap-[18px] text-[12px] text-faint">
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
