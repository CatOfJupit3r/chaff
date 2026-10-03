import { CheckIcon } from '@~/components/icons/icons';

import { TEST_TIER_IS_READ } from '../digests.enums';
import type { iDigestTest } from '../digests.types';
import { InlineCodeText } from './inline-code-text';

interface iUnitTestsViewProps {
  tests: readonly iDigestTest[];
  headSha: string;
  hasDigest: boolean;
  onOpenInEditor: (path: string, line?: number) => void;
}

const NO = <span className="text-faint">–</span>;
const YES = <CheckIcon aria-label="yes" className="mx-auto size-3.5 text-good" />;

/** Tests the digest tied to this unit, keeping apart "a test exists", "it was read" and "it passed". */
export function UnitTestsView({ tests, headSha, hasDigest, onOpenInEditor }: iUnitTestsViewProps) {
  if (tests.length === 0) {
    return (
      <p className="m-0 px-[22px] py-5 text-[13px] text-muted">
        {hasDigest
          ? 'The digest found no test that covers this unit.'
          : 'No test file mentions this code by name. The AI digest looks further; write one from the top bar.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-[22px] py-4">
      <p className="m-0 text-[12.5px] text-muted">
        Three separate facts: a test exists, the agent read it, and it passed on{' '}
        <span className="font-mono">{headSha.slice(0, 7)}</span>. Chaff does not run tests, so the last column stays
        empty until results come from CI.
      </p>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-left text-[11.5px] text-faint">
            <th className="py-1.5 pr-3 font-normal">Test</th>
            <th className="w-[70px] py-1.5 text-center font-normal">Exists</th>
            <th className="w-[90px] py-1.5 text-center font-normal">Agent read it</th>
            <th className="w-[90px] py-1.5 text-center font-normal">Passed</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={`${test.path}:${test.line}:${test.note}`} className="border-b border-line align-top last:border-0">
              <td className="py-2 pr-3">
                <button
                  type="button"
                  onClick={() => onOpenInEditor(test.path, test.line)}
                  className="font-mono text-accent hover:underline"
                >
                  {test.path}
                  {test.line ? `:${test.line}` : ''}
                </button>
                {test.note ? (
                  <div className="mt-0.5 text-fg-soft">
                    <InlineCodeText text={test.note} />
                  </div>
                ) : null}
              </td>
              <td className="py-2 text-center">{YES}</td>
              <td className="py-2 text-center">{TEST_TIER_IS_READ(test.tier) ? YES : NO}</td>
              <td className="py-2 text-center">{NO}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
