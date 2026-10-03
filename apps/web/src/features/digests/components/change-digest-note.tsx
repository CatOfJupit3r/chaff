import { DIGEST_RUNNER_LABELS, INTENT_SOURCES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { SparkIcon } from '@~/components/icons/icons';

import { INTENT_SOURCE_LABELS } from '../digests.enums';
import type { iDigestGroup } from '../digests.types';
import { InlineCodeText } from './inline-code-text';

interface iChangeDigestNoteProps {
  runner: DigestRunner;
  group: iDigestGroup;
}

/** What the digest says a change does: before, after and why. */
export function ChangeDigestNote({ runner, group }: iChangeDigestNoteProps) {
  return (
    <div className="px-[22px] pb-4">
      <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-faint">
        <SparkIcon className="size-[13px]" />
        Digest · {DIGEST_RUNNER_LABELS(runner)}, read-only
      </div>
      {group.before || group.after ? (
        <div className="grid max-w-[78ch] gap-3 text-[13px] leading-[1.55] md:grid-cols-2">
          <div>
            <div className="mb-0.5 text-[11.5px] text-faint">Before</div>
            <p className="m-0 text-fg-soft">
              <InlineCodeText text={group.before} />
            </p>
          </div>
          <div>
            <div className="mb-0.5 text-[11.5px] text-faint">After</div>
            <p className="m-0 text-fg-soft">
              <InlineCodeText text={group.after} />
            </p>
          </div>
        </div>
      ) : null}
      {group.intent ? (
        <p className="m-0 mt-2 max-w-[78ch] text-[12.5px] leading-[1.55] text-muted">
          <InlineCodeText text={group.intent} />
          <span
            className={
              group.intentSource === INTENT_SOURCES.INFERRED
                ? 'ml-1.5 rounded-[4px] border border-warn-line px-[5px] text-[10.5px] text-warn'
                : 'ml-1.5 rounded-[4px] border border-line px-[5px] text-[10.5px] text-faint'
            }
          >
            {INTENT_SOURCE_LABELS(group.intentSource)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
