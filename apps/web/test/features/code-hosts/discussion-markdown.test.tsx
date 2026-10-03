import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { DiscussionThread } from '@~/features/code-hosts/components/discussion-thread';

const { openLink, renderMermaid } = vi.hoisted(() => ({ openLink: vi.fn(), renderMermaid: vi.fn() }));
vi.mock('@~/features/code-hosts/hooks/use-open-link', () => ({ useOpenLink: () => openLink }));
vi.mock('@~/features/digests/mermaid.utils', () => ({ renderMermaid }));

function renderDiscussion(body: string) {
  return render(
    <DiscussionThread
      discussion={{
        id: 'thread',
        isResolved: false,
        isOnSnapshot: true,
        webUrl: 'https://gitlab.com/group/project/-/merge_requests/47',
        notes: [{ id: 'note', authorName: 'Reviewer', body, createdAt: new Date('2026-10-03') }],
      }}
    />,
  );
}

describe('rich review content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderMermaid.mockResolvedValue('<svg aria-label="Rendered flow"></svg>');
  });

  it('routes Mermaid blocks to the diagram renderer inside a comment and keeps surrounding Markdown', async () => {
    renderDiscussion(
      'Use **backoff** with `jitter`.\n\n```mermaid\nflowchart LR\n  Retry --> Delivery\n```\n\n- [x] Retry checked\n\n| Step | Result |\n| --- | --- |\n| Retry | Passed |',
    );
    expect(screen.getByText('backoff').tagName).toBe('STRONG');
    expect(screen.getByText('jitter').tagName).toBe('CODE');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('table')).toHaveTextContent('Passed');
    expect(await screen.findByLabelText('Rendered flow')).toBeInTheDocument();
    expect(renderMermaid).toHaveBeenCalledWith('flowchart LR\n  Retry --> Delivery\n');
  });

  it('keeps invalid diagram source readable and leaves unsupported diagram languages as code', async () => {
    renderMermaid.mockRejectedValue(new Error('Invalid diagram'));
    renderDiscussion('```mermaid\ninvalid graph\n```\n\n```plantuml\nAlice -> Bob: Request\n```');
    expect(await screen.findByText('invalid graph')).toBeInTheDocument();
    expect(screen.getByText('Alice -> Bob: Request')).toBeInTheDocument();
  });

  it('opens safe relative links through the host without activating script links or HTML', async () => {
    const user = userEvent.setup();
    const { container } = renderDiscussion(
      '[details](/group/project/-/issues/3) [unsafe](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>\n\n![Diagram attachment](https://gitlab.com/group/project/uploads/diagram.png)',
    );
    await user.click(screen.getByRole('link', { name: 'details' }));
    expect(openLink).toHaveBeenCalledWith('https://gitlab.com/group/project/-/issues/3');
    expect(screen.queryByRole('link', { name: 'unsafe' })).not.toBeInTheDocument();
    expect(container.querySelector('img, script, [onerror]')).toBeNull();
    expect(screen.getByRole('link', { name: /Diagram attachment/ })).toHaveAttribute(
      'href',
      'https://gitlab.com/group/project/uploads/diagram.png',
    );
  });

  it('renders formatted request names safely inside branch-selection buttons without nested links', () => {
    const { container } = render(
      <button type="button">
        <MarkdownTitle text="Fix **retries** in `send()` and [delivery](https://example.com)" />
      </button>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('Fix retries in send() and delivery');
    expect(screen.getByText('retries').tagName).toBe('STRONG');
    expect(container.querySelector('a, p')).toBeNull();
  });
});
