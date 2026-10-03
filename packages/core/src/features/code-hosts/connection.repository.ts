import type { iConnectionRecord, iNewConnection } from './code-hosts.types';

export interface iConnectionRepository {
  list: () => Promise<iConnectionRecord[]>;
  findById: (connectionId: string) => Promise<iConnectionRecord | undefined>;
  create: (input: iNewConnection) => Promise<iConnectionRecord>;
  update: (connectionId: string, input: Pick<iNewConnection, 'username'>) => Promise<iConnectionRecord | undefined>;
  delete: (connectionId: string) => Promise<boolean>;
}
