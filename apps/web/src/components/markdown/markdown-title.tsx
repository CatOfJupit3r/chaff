import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { INLINE_MARKDOWN_ELEMENTS } from './markdown.constants';
import type { iMarkdownProps } from './markdown.types';

export function MarkdownTitle({ text, className }: Pick<iMarkdownProps, 'text' | 'className'>) {
  return (
    <span className={className}>
      <Markdown remarkPlugins={[remarkGfm]} allowedElements={INLINE_MARKDOWN_ELEMENTS} unwrapDisallowed skipHtml>
        {text}
      </Markdown>
    </span>
  );
}
