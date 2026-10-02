import { UnitTestsView } from '@~/features/digests/components/unit-tests-view';
import type { iDigestTest } from '@~/features/digests/digests.types';

import type { iFoundTest } from '../found-tests.utils';

interface iFoundTestsViewProps {
  tests: readonly iFoundTest[];
  hasDigest: boolean;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** Test files found by name: they mention the code, but nothing read or ran them. */
function FoundTestsView({ tests, hasDigest, onOpenInEditor }: iFoundTestsViewProps) {
  return (
    <div className="flex flex-col gap-3 px-[22px] py-4">
      <p className="m-0 text-[12.5px] text-muted">
        Found by name: these test files mention the changed code. Nobody has read or run them yet
        {hasDigest ? '.' : '; the AI digest reads them and says what they check.'}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12.5px]">
        {tests.map((test) => (
          <li key={test.path} className="flex flex-wrap items-baseline gap-x-2">
            <button
              type="button"
              onClick={() => onOpenInEditor(test.path, test.line)}
              className="font-mono text-accent hover:underline"
            >
              {test.path}:{test.line}
            </button>
            <span className="text-muted">
              mentions <code className="font-mono text-fg-soft">{test.symbol}</code>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface iCardTestsViewProps {
  tests: readonly iDigestTest[];
  found: readonly iFoundTest[];
  headSha: string;
  hasDigest: boolean;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** The digest's tests for the card, or, when it named none, the test files that mention the code. */
export function CardTestsView({ tests, found, headSha, hasDigest, onOpenInEditor }: iCardTestsViewProps) {
  return (
    <div className="border-t border-line">
      {tests.length === 0 && found.length > 0 ? (
        <FoundTestsView tests={found} hasDigest={hasDigest} onOpenInEditor={onOpenInEditor} />
      ) : (
        <UnitTestsView tests={tests} headSha={headSha} hasDigest={hasDigest} onOpenInEditor={onOpenInEditor} />
      )}
    </div>
  );
}
