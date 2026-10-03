import { randomUUID } from 'node:crypto';
import { inject, singleton } from 'tsyringe';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { CHANGE_UNIT_REPOSITORY_TOKEN, DIGEST_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iDigestRepository } from '@~/features/digests/digest.repository';
import type { iDigestContent } from '@~/features/digests/digests.types';
import { ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import type { iSnapshotRepository } from '../snapshots/snapshot.repository';
import type { iChangeUnitRepository } from './change-unit.repository';
import type { iChangeUnitRecord } from './change-units.types';
import {
  changesFromDigest,
  createChange,
  mergeChanges,
  moveUnits,
  removeChange,
  renameChange,
  reorderChanges,
} from './change-units.utils';

/**
 * Change units: groupings of a snapshot's Function and Section units into behavior or design changes. Every
 * edit stores the snapshot's whole list, and units no change covers stay reachable on their own.
 */
@singleton()
export class ChangeUnitsService {
  constructor(
    @inject(CHANGE_UNIT_REPOSITORY_TOKEN) private readonly changeUnitRepository: iChangeUnitRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    @inject(DIGEST_REPOSITORY_TOKEN) private readonly digestRepository: iDigestRepository,
  ) {}

  public async list(snapshotId: string) {
    await this.getSnapshot(snapshotId);
    return this.changeUnitRepository.list(snapshotId);
  }

  public async create(input: { snapshotId: string; title: string; unitIds: string[]; afterChangeUnitId?: string }) {
    return this.edit(input.snapshotId, input.unitIds, (changes) => {
      if (input.afterChangeUnitId) this.requireChange(changes, input.afterChangeUnitId);
      return createChange(
        changes,
        { id: randomUUID(), title: input.title, unitIds: input.unitIds },
        input.afterChangeUnitId,
      );
    });
  }

  public async moveUnits(input: { snapshotId: string; unitIds: string[]; changeUnitId: string | null }) {
    return this.edit(input.snapshotId, input.unitIds, (changes) => {
      if (input.changeUnitId) this.requireChange(changes, input.changeUnitId);
      return moveUnits(changes, input.unitIds, input.changeUnitId);
    });
  }

  public async merge(input: { snapshotId: string; changeUnitIds: string[]; title?: string }) {
    return this.edit(input.snapshotId, [], (changes) => {
      for (const changeUnitId of input.changeUnitIds) this.requireChange(changes, changeUnitId);
      return mergeChanges(changes, input.changeUnitIds, input.title);
    });
  }

  public async rename(input: { snapshotId: string; changeUnitId: string; title: string }) {
    return this.edit(input.snapshotId, [], (changes) => {
      this.requireChange(changes, input.changeUnitId);
      return renameChange(changes, input.changeUnitId, input.title);
    });
  }

  public async reorder(input: { snapshotId: string; changeUnitIds: string[] }) {
    return this.edit(input.snapshotId, [], (changes) => {
      for (const changeUnitId of input.changeUnitIds) this.requireChange(changes, changeUnitId);
      return reorderChanges(changes, input.changeUnitIds);
    });
  }

  public async remove(input: { snapshotId: string; changeUnitId: string }) {
    return this.edit(input.snapshotId, [], (changes) => {
      this.requireChange(changes, input.changeUnitId);
      return removeChange(changes, input.changeUnitId);
    });
  }

  /** Replaces the snapshot's Change units with the groups of its newest ready digest. */
  public async useDigest(snapshotId: string) {
    await this.getSnapshot(snapshotId);
    const digest = await this.digestRepository.findLatest(snapshotId);
    if (digest?.status !== DIGEST_STATUSES.READY || !digest.content) {
      throw ORPCNotFoundError(errorCodes.DIGEST_NOT_FOUND);
    }
    await this.storeDigestGroups(snapshotId, digest.content);
    return this.changeUnitRepository.list(snapshotId);
  }

  /** Called when a digest is ready: its groups become the Change units unless the snapshot already has some. */
  public async adoptDigest(snapshotId: string, content: iDigestContent) {
    const existing = await this.changeUnitRepository.list(snapshotId);
    if (existing.length > 0) return;
    await this.storeDigestGroups(snapshotId, content);
  }

  /**
   * Copies the Change units to a newer snapshot of the same review, following each unit to its successor.
   * Units new in the newer snapshot are in no change; a change whose units are all gone is dropped.
   */
  public async carryOver(fromSnapshotId: string, toSnapshotId: string) {
    const [previous, units] = await Promise.all([
      this.changeUnitRepository.list(fromSnapshotId),
      this.snapshotRepository.listUnits(toSnapshotId),
    ]);
    if (previous.length === 0) return;
    const successor = new Map(
      units.flatMap((unit) => (unit.previousUnitId ? [[unit.previousUnitId, unit.id] as const] : [])),
    );
    const carried = previous.flatMap((change): iChangeUnitRecord[] => {
      const unitIds = change.unitIds.flatMap((unitId) => successor.get(unitId) ?? []);
      if (unitIds.length === 0) return [];
      return [{ id: randomUUID(), title: change.title, source: change.source, unitIds }];
    });
    await this.changeUnitRepository.replace(toSnapshotId, carried);
  }

  private async storeDigestGroups(snapshotId: string, content: iDigestContent) {
    const units = await this.snapshotRepository.listUnits(snapshotId);
    const changes = changesFromDigest(content.groups, new Set(units.map((unit) => unit.id)), randomUUID);
    await this.changeUnitRepository.replace(snapshotId, changes);
  }

  /** Checks the snapshot and the units, applies the edit to the stored list and stores the result. */
  private async edit(
    snapshotId: string,
    unitIds: readonly string[],
    apply: (changes: iChangeUnitRecord[]) => iChangeUnitRecord[],
  ) {
    await this.getSnapshot(snapshotId);
    if (unitIds.length > 0) {
      const known = new Set((await this.snapshotRepository.listUnits(snapshotId)).map((unit) => unit.id));
      if (unitIds.some((unitId) => !known.has(unitId))) throw ORPCNotFoundError(errorCodes.UNIT_NOT_FOUND);
    }
    const changes = apply(await this.changeUnitRepository.list(snapshotId));
    await this.changeUnitRepository.replace(snapshotId, changes);
    return this.changeUnitRepository.list(snapshotId);
  }

  private requireChange(changes: readonly iChangeUnitRecord[], changeUnitId: string) {
    if (!changes.some((change) => change.id === changeUnitId)) {
      throw ORPCNotFoundError(errorCodes.CHANGE_UNIT_NOT_FOUND);
    }
  }

  private async getSnapshot(snapshotId: string) {
    const snapshot = await this.snapshotRepository.findById(snapshotId);
    if (!snapshot) throw ORPCNotFoundError(errorCodes.SNAPSHOT_NOT_FOUND);
    return snapshot;
  }
}
