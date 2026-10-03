import type { ComponentProps } from 'react';

import { ExternalIcon } from '@~/components/icons/icons';
import { useOpenLink } from '@~/features/code-hosts/hooks/use-open-link';

export function MarkdownLink({ href, children }: Pick<ComponentProps<'a'>, 'href' | 'children'>) {
  const openLink = useOpenLink();
  if (!href) return <span>{children}</span>;
  return (
    <a
      href={href}
      className="text-accent underline underline-offset-2"
      onClick={(event) => {
        event.preventDefault();
        openLink(href);
      }}
    >
      {children}
    </a>
  );
}

export function MarkdownAttachment({ src, alt }: Pick<ComponentProps<'img'>, 'src' | 'alt'>) {
  if (typeof src !== 'string' || !src) return <span>{alt ?? 'Attachment'}</span>;
  return (
    <MarkdownLink href={src}>
      {alt ?? 'Open attachment'} <ExternalIcon className="inline size-3" />
    </MarkdownLink>
  );
}

export function MarkdownTable({ children }: Pick<ComponentProps<'table'>, 'children'>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function MarkdownTableHeading({ children }: Pick<ComponentProps<'th'>, 'children'>) {
  return <th className="border border-line bg-raised px-3 py-2 font-medium">{children}</th>;
}

export function MarkdownTableCell({ children }: Pick<ComponentProps<'td'>, 'children'>) {
  return <td className="border border-line px-3 py-2">{children}</td>;
}
