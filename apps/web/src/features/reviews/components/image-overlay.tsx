import { useMemo, useState } from 'react';

import { imageDataUrl } from '../file-preview.utils';
import { IMAGE_COMPARISONS } from '../reviews.enums';
import type { ImageComparison } from '../reviews.enums';
import type { iFileImage } from '../reviews.types';

const IMAGE_CLASS = 'max-h-[60vh] max-w-full object-contain';

interface iImageOverlayProps {
  before: iFileImage;
  after: iFileImage;
  /** Swipe or Fade. */
  comparison: ImageComparison;
  alt: string;
}

/** Both versions of an image stacked: a slider swipes the new one in from the right or fades it in. */
export function ImageOverlay({ before, after, comparison, alt }: iImageOverlayProps) {
  const [position, setPosition] = useState(50);
  const sources = useMemo(() => ({ before: imageDataUrl(before), after: imageDataUrl(after) }), [before, after]);
  const isSwipe = comparison === IMAGE_COMPARISONS.SWIPE;

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="rounded-md border border-line bg-checker p-3">
        <div className="relative grid">
          <div className="col-start-1 row-start-1 grid place-items-center">
            <img src={sources.before} alt={`${alt} before`} decoding="async" className={IMAGE_CLASS} />
          </div>
          <div
            style={isSwipe ? { clipPath: `inset(0 0 0 ${position}%)` } : { opacity: position / 100 }}
            className="col-start-1 row-start-1 grid place-items-center"
          >
            <img src={sources.after} alt={`${alt} after`} decoding="async" className={IMAGE_CLASS} />
          </div>
          {isSwipe ? (
            <span
              aria-hidden
              style={{ left: `${position}%` }}
              className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent"
            />
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-3 text-[12px] text-muted">
        Before
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          aria-label={isSwipe ? 'Swipe position' : 'Fade amount'}
          onChange={(event) => setPosition(Number(event.currentTarget.value))}
          className="flex-1 accent-accent"
        />
        After
      </label>
    </div>
  );
}
