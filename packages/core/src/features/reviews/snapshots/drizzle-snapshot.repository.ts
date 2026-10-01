import { and, asc, count, desc, eq, getTableColumns } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { regions, snapshotFiles, snapshots, units } from '@~/db/schema/snapshots.schema';
import { unitMarks } from '@~/db/schema/unit-marks.schema';

import type { iSnapshotRepository } from './snapshot.repository';
import { SnapshotResolver } from './snapshot.resolver';
import type { iNewSnapshot, iSnapshotContent } from './snapshots.types';

/** Rows per insert statement, well under SQLite's bound-parameter limit. */
const INSERT_CHUNK_SIZE = 400;

function chunk<TItem>(items: readonly TItem[]) {
  const chunks: TItem[][] = [];
  for (let start = 0; start < items.length; start += INSERT_CHUNK_SIZE) {
    chunks.push(items.slice(start, start + INSERT_CHUNK_SIZE));
  }
  return chunks;
}

const { patch: _patch, ...fileColumns } = getTableColumns(snapshotFiles);
const unitWithMarkColumns = { ...getTableColumns(units), mark: unitMarks.mark };

@singleton()
export class DrizzleSnapshotRepository implements iSnapshotRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly snapshotResolver: SnapshotResolver,
  ) {}

  public async findById(snapshotId: string) {
    return this.databaseService.getDb().select().from(snapshots).where(eq(snapshots.id, snapshotId)).get();
  }

  public async findLatest(targetId: string) {
    return this.databaseService
      .getDb()
      .select()
      .from(snapshots)
      .where(eq(snapshots.targetId, targetId))
      .orderBy(desc(snapshots.version))
      .limit(1)
      .get();
  }

  public async create(snapshot: iNewSnapshot, content: iSnapshotContent) {
    const db = this.databaseService.getDb();
    return db.transaction((transaction) => {
      const row = transaction.insert(snapshots).values(snapshot).returning().get();
      const snapshotId = row.id;
      for (const files of chunk(content.files)) {
        transaction
          .insert(snapshotFiles)
          .values(files.map((file) => ({ ...file, snapshotId })))
          .run();
      }
      for (const batch of chunk(content.units)) {
        transaction
          .insert(units)
          .values(batch.map((unit) => ({ ...unit, snapshotId })))
          .run();
      }
      for (const batch of chunk(content.regions)) {
        transaction
          .insert(regions)
          .values(batch.map((region) => ({ ...region, snapshotId })))
          .run();
      }
      return row;
    });
  }

  public async listFiles(snapshotId: string) {
    const db = this.databaseService.getDb();
    const rows = db
      .select(fileColumns)
      .from(snapshotFiles)
      .where(eq(snapshotFiles.snapshotId, snapshotId))
      .orderBy(asc(snapshotFiles.ordinal))
      .all();
    const unitCounts = this.countByFile(
      db
        .select({ fileId: units.fileId, total: count() })
        .from(units)
        .where(eq(units.snapshotId, snapshotId))
        .groupBy(units.fileId)
        .all(),
    );
    const regionCounts = this.countByFile(
      db
        .select({ fileId: regions.fileId, total: count() })
        .from(regions)
        .where(eq(regions.snapshotId, snapshotId))
        .groupBy(regions.fileId)
        .all(),
    );

    return rows.map((row) => {
      const {
        oldBlobSha: _oldBlobSha,
        newBlobSha: _newBlobSha,
        ...file
      } = this.snapshotResolver.toSnapshotFileRecord(row);
      return { ...file, unitCount: unitCounts.get(row.id) ?? 0, regionCount: regionCounts.get(row.id) ?? 0 };
    });
  }

  public async findFile(snapshotId: string, fileId: string) {
    const row = this.databaseService
      .getDb()
      .select(fileColumns)
      .from(snapshotFiles)
      .where(and(eq(snapshotFiles.snapshotId, snapshotId), eq(snapshotFiles.id, fileId)))
      .get();
    return row ? this.snapshotResolver.toSnapshotFileRecord(row) : undefined;
  }

  public async findPatch(snapshotId: string, fileId: string) {
    const row = this.databaseService
      .getDb()
      .select({ patch: snapshotFiles.patch })
      .from(snapshotFiles)
      .where(and(eq(snapshotFiles.snapshotId, snapshotId), eq(snapshotFiles.id, fileId)))
      .get();
    return row ? { patch: row.patch ?? undefined } : undefined;
  }

  public async listUnits(snapshotId: string) {
    return this.databaseService
      .getDb()
      .select(unitWithMarkColumns)
      .from(units)
      .leftJoin(unitMarks, eq(unitMarks.unitId, units.id))
      .where(eq(units.snapshotId, snapshotId))
      .orderBy(asc(units.ordinal))
      .all()
      .map((row) => this.snapshotResolver.toUnitRecord(row));
  }

  public async findUnit(snapshotId: string, unitId: string) {
    const row = this.databaseService
      .getDb()
      .select(unitWithMarkColumns)
      .from(units)
      .leftJoin(unitMarks, eq(unitMarks.unitId, units.id))
      .where(and(eq(units.snapshotId, snapshotId), eq(units.id, unitId)))
      .get();
    return row ? this.snapshotResolver.toUnitRecord(row) : undefined;
  }

  private countByFile(rows: { fileId: string; total: number }[]) {
    return new Map(rows.map((row) => [row.fileId, row.total]));
  }
}
