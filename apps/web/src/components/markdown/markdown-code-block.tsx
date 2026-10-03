import type { ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';

import { MermaidDiagram } from '@~/features/digests/components/mermaid-diagram';

import { MERMAID_CODE_CLASS } from './markdown.constants';

export function MarkdownCodeBlock({ node, children }: ComponentProps<'pre'> & ExtraProps) {
  const code = node?.children[0];
  if (
    code?.type === 'element' &&
    Array.isArray(code.properties.className) &&
    code.properties.className.includes(MERMAID_CODE_CLASS)
  ) {
    const source = code.children.flatMap((child) => (child.type === 'text' ? [child.value] : [])).join('');
    return <MermaidDiagram source={source} title="Comment diagram" />;
  }
  return (
    <pre className="overflow-x-auto rounded-md border border-line bg-canvas p-3 font-mono text-code text-fg-code">
      {children}
    </pre>
  );
}
