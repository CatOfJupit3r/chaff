import { findingAnchors, findingEvents, findings } from './schema/findings.schema';
import { reviewTargets } from './schema/review-targets.schema';
import { settings } from './schema/settings.schema';
import { regions, snapshotFiles, snapshots, units } from './schema/snapshots.schema';
import { unitMarks } from './schema/unit-marks.schema';
import { workspaces } from './schema/workspaces.schema';

export const schema = {
  settings,
  workspaces,
  reviewTargets,
  snapshots,
  snapshotFiles,
  units,
  regions,
  unitMarks,
  findings,
  findingAnchors,
  findingEvents,
};
