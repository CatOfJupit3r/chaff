import { Kbd } from '@~/components/ui/kbd';

interface iHint {
  keys: string[];
  label: string;
  /** The keys are the two ends of a range. */
  isRange?: boolean;
}

const HINTS: iHint[] = [
  { keys: ['←', '→'], label: 'move' },
  { keys: ['G'], label: 'looks good' },
  { keys: ['C'], label: 'concern' },
  { keys: ['Q'], label: 'question' },
  { keys: ['L'], label: 'later' },
  { keys: ['U'], label: 'undo' },
  { keys: ['1', '4'], label: 'code, usages, diagram, tests', isRange: true },
  { keys: ['I'], label: 'context' },
];

export function FocusHints() {
  return (
    <div className="mt-[18px] flex flex-wrap justify-center gap-[18px] text-[12px] text-faint">
      {HINTS.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          {hint.keys.map((key, index) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              {hint.isRange && index > 0 ? '–' : null}
              <Kbd>{key}</Kbd>
            </span>
          ))}
          {hint.label}
        </span>
      ))}
    </div>
  );
}
