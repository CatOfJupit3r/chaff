import { useState } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';

import { SegmentedControl } from '@~/components/ui/segmented-control';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { useFileImages } from '../hooks/use-file-images';
import { IMAGE_COMPARISON_LABELS, IMAGE_COMPARISONS, imageComparisonValues } from '../reviews.enums';
import type { ImageComparison } from '../reviews.enums';
import type { iSnapshotFile } from '../reviews.types';
import { FileNote } from './file-notes';
import { ImageFrame } from './image-frame';
import { ImageOverlay } from './image-overlay';
import { PreviewSides } from './preview-sides';
import { PreviewSkeleton } from './skeleton-components';

const COMPARISON_OPTIONS = imageComparisonValues.map((value) => ({
  value,
  label: IMAGE_COMPARISON_LABELS.get(value),
}));

interface iImagePreviewProps {
  snapshotId: string;
  file: iSnapshotFile;
  layout: DiffLayout;
}

/** An image file drawn as it was before and after the change, beside each other, swiped or faded. */
export function ImagePreview({ snapshotId, file, layout }: iImagePreviewProps) {
  const images = useFileImages(snapshotId, file.id);
  const [comparison, setComparison] = useState<ImageComparison>(IMAGE_COMPARISONS.BOTH);

  if (images.error) return <FileNote>Could not load this image: {getErrorMessage(images.error)}</FileNote>;
  if (!images.data) return <PreviewSkeleton />;
  const { oldImage, newImage } = images.data;
  if (!oldImage && !newImage) {
    return <FileNote>This image is too large to show here. Open it in your editor instead.</FileNote>;
  }
  const sides = (
    <PreviewSides
      layout={layout}
      before={oldImage ? <ImageFrame image={oldImage} alt={`${file.oldPath ?? file.path} before`} /> : undefined}
      after={newImage ? <ImageFrame image={newImage} alt={`${file.path} after`} /> : undefined}
    />
  );
  if (!oldImage || !newImage) return sides;

  return (
    <>
      <div className="flex px-4 pt-3">
        <SegmentedControl
          label="Compare images"
          options={COMPARISON_OPTIONS}
          value={comparison}
          onChange={setComparison}
        />
      </div>
      {comparison === IMAGE_COMPARISONS.BOTH ? (
        sides
      ) : (
        <ImageOverlay before={oldImage} after={newImage} comparison={comparison} alt={file.path} />
      )}
    </>
  );
}
