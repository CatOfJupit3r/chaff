import type { DiffSide } from '@chaff/common/enums/review.enums';

import { MarkdownBody } from '@~/components/markdown/markdown-body';

import { RepoFileVersionContext } from '../repo-file-version.context';
import { RepoMarkdownImage } from './repo-markdown-image';

interface iMarkdownPreviewProps {
  snapshotId: string;
  side: DiffSide;
  /** The Markdown file's path on this side; image links are resolved from its folder. */
  path: string;
  text: string;
}

/** One version of a Markdown file drawn, with the images it links to read from the same version. */
export function MarkdownPreview({ snapshotId, side, path, text }: iMarkdownPreviewProps) {
  return (
    <RepoFileVersionContext value={{ snapshotId, side, path }}>
      <MarkdownBody
        text={text}
        image={RepoMarkdownImage}
        className="rounded-md border border-line bg-surface px-5 py-3"
      />
    </RepoFileVersionContext>
  );
}
