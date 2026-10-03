import { DIGEST_RUNNER_LABELS, INTENT_SOURCES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { SparkIcon } from '@~/components/icons/icons';

import { INTENT_SOURCE_LABELS } from '../digests.enums';
import type { iDigestGroup, iDigestUnitNote } from '../digests.types';
import { InlineCodeText } from './inline-code-text';

interface iUnitDigestNotesProps {
  runner: DigestRunner;
  note: iDigestUnitNote | undefined;
  group: iDigestGroup | undefined;
}

/** What the digest says about this unit and what it thinks is worth a look; suggestions, not verdicts. */
export function UnitDigestNotes({ runner, note, group }: iUnitDigestNotesProps) {
  const intent = group && !group.isUnexplained && group.intent ? group : undefined;
  if (!note && !intent) return null;

  return (
    <div className="grid gap-[18px] px-[22px] pb-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-faint">
          <SparkIcon className="size-[13px]" />
          Digest · {DIGEST_RUNNER_LABELS(runner)}, read-only
        </div>
        {note?.summary ? (
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-fg-soft">
            <InlineCodeText text={note.summary} />
          </p>
        ) : null}
        {intent ? (
          <p className="m-0 mt-1.5 max-w-[62ch] text-[12.5px] leading-[1.55] text-muted">
            <span className="text-fg-soft">{intent.title}.</span> <InlineCodeText text={intent.intent} />
            <span
              className={
                intent.intentSource === INTENT_SOURCES.INFERRED
                  ? 'ml-1.5 rounded-[4px] border border-warn-line px-[5px] text-[10.5px] text-warn'
                  : 'ml-1.5 rounded-[4px] border border-line px-[5px] text-[10.5px] text-faint'
              }
            >
              {INTENT_SOURCE_LABELS(intent.intentSource)}
            </span>
          </p>
        ) : null}
      </div>
      {note && note.worthChecking.length > 0 ? (
        <div>
          <div className="mb-1.5 text-[11.5px] text-faint">Worth checking</div>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-[13px] leading-normal text-fg-soft marker:text-faint">
            {note.worthChecking.map((item) => (
              <li key={item}>
                <InlineCodeText text={item} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
