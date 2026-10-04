import type { ComponentProps } from 'react';

import { MarkdownAttachment } from '@~/components/markdown/markdown-elements';
import { markdownUrl } from '@~/components/markdown/markdown-url.utils';

import { imageDataUrl, resolveRepoPath } from '../file-preview.utils';
import { useSnapshotImage } from '../hooks/use-snapshot-image';
import { useRepoFileVersion } from '../repo-file-version.context';

/** An image a Markdown file links to, read from the repository at the file's version; outside links stay links. */
export function RepoMarkdownImage({ src, alt }: Pick<ComponentProps<'img'>, 'src' | 'alt'>) {
  const version = useRepoFileVersion();
  const link = typeof src === 'string' ? src : '';
  const repoPath = link ? resolveRepoPath(version.path, link) : undefined;
  const image = useSnapshotImage(version.snapshotId, version.side, repoPath);

  if (repoPath === undefined) return <MarkdownAttachment src={markdownUrl(link)} alt={alt} />;
  if (image.data) {
    return <img src={imageDataUrl(image.data)} alt={alt ?? ''} decoding="async" className="inline-block max-w-full" />;
  }
  const label = alt?.length ? alt : repoPath;
  if (image.isPending) return <span className="text-muted">{label}</span>;
  return <span className="text-muted">{`${label} (image not found in the repository)`}</span>;
}
