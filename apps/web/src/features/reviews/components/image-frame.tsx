import { useMemo, useState } from 'react';

import { imageDataUrl, formatByteSize } from '../file-preview.utils';
import type { iFileImage } from '../reviews.types';

interface iImageSize {
  width: number;
  height: number;
}

interface iImageFrameProps {
  image: iFileImage;
  alt: string;
}

/** One version of an image on a checkered backdrop, so transparent areas show, with its size beneath. */
export function ImageFrame({ image, alt }: iImageFrameProps) {
  const src = useMemo(() => imageDataUrl(image), [image]);
  const [size, setSize] = useState<iImageSize>();
  const [isBroken, setIsBroken] = useState(false);
  const facts = [size && size.width > 0 ? `${size.width} x ${size.height}` : undefined, formatByteSize(image.byteSize)];

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2">
      <div className="grid min-h-24 place-items-center overflow-auto rounded-md border border-line bg-checker p-3">
        {isBroken ? (
          <span className="text-[12.5px] text-muted">This image could not be drawn.</span>
        ) : (
          <img
            src={src}
            alt={alt}
            decoding="async"
            onLoad={(event) =>
              setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            }
            onError={() => setIsBroken(true)}
            className="max-h-[60vh] max-w-full object-contain"
          />
        )}
      </div>
      <figcaption className="font-mono text-[12px] text-muted">{facts.filter(Boolean).join(' · ')}</figcaption>
    </figure>
  );
}
