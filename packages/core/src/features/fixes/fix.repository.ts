import type { iFixRecord, iFixUpdate, iNewFix } from './fixes.types';

export interface iFixRepository {
  /** Records a new fix as running. */
  create: (fix: iNewFix) => Promise<iFixRecord>;
  findById: (fixId: string) => Promise<iFixRecord | undefined>;
  /** The review target's fixes, newest first. */
  listByTarget: (targetId: string) => Promise<iFixRecord[]>;
  update: (fixId: string, changes: iFixUpdate) => Promise<iFixRecord | undefined>;
  remove: (fixId: string) => Promise<unknown>;
  /** Marks fixes still running, from a run the app did not finish, as failed. */
  failRunning: (error: string) => Promise<number>;
}
