import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PreviewBoundary } from '@~/features/reviews/components/preview-boundary';

const preview = { shouldThrow: true };

function FlakyPreview() {
  if (preview.shouldThrow) throw new Error('Bad diagram');
  return <p>Drawn preview</p>;
}

describe('PreviewBoundary', () => {
  it('replaces a preview that throws with a note, keeps the rest of the screen, and draws it again on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <>
        <p>Diff toolbar</p>
        <PreviewBoundary>
          <FlakyPreview />
        </PreviewBoundary>
      </>,
    );

    expect(screen.getByText('Diff toolbar')).toBeInTheDocument();
    expect(screen.getByText(/This preview could not be drawn: Bad diagram/)).toBeInTheDocument();
    preview.shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Drawn preview')).toBeInTheDocument();
  });
});
