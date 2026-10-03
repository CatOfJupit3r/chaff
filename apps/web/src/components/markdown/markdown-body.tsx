import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@~/lib/utils';

import { MarkdownCodeBlock } from './markdown-code-block';
import {
  MarkdownAttachment,
  MarkdownLink,
  MarkdownTable,
  MarkdownTableCell,
  MarkdownTableHeading,
} from './markdown-elements';
import { markdownUrl } from './markdown-url.utils';
import type { iMarkdownProps } from './markdown.types';

export function MarkdownBody({ text, baseUrl, className }: iMarkdownProps) {
  return (
    <div
      className={cn(
        'min-w-0 space-y-3 text-sm/relaxed wrap-anywhere text-fg-soft [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_code]:font-mono [&_code]:text-code [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_strong]:text-fg [&_ul]:list-disc [&_ul]:pl-6',
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => markdownUrl(url, baseUrl) ?? ''}
        components={{
          pre: MarkdownCodeBlock,
          a: MarkdownLink,
          img: MarkdownAttachment,
          table: MarkdownTable,
          th: MarkdownTableHeading,
          td: MarkdownTableCell,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
