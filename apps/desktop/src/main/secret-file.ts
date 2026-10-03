import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { iSecretStore } from '@~/host/core-host.types';

export interface iSecretCipher {
  isAvailable: () => boolean;
  encrypt: (value: string) => Buffer;
  decrypt: (value: Buffer) => string;
}

/**
 * Secrets encrypted by the OS keychain and kept in one JSON file of base64 values. Nothing is written
 * when the OS cannot encrypt, so a token is never stored in plain text.
 */
export class SecretFile implements iSecretStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly cipher: iSecretCipher,
  ) {}

  public isAvailable() {
    return this.cipher.isAvailable();
  }

  public async read(key: string) {
    const value = (await this.load())[key];
    if (value === undefined || !this.isAvailable()) return null;
    try {
      return this.cipher.decrypt(Buffer.from(value, 'base64'));
    } catch {
      return null;
    }
  }

  public async write(key: string, value: string) {
    if (!this.isAvailable()) throw new Error('Secure storage is not available');
    await this.update((entries) => ({ ...entries, [key]: this.cipher.encrypt(value).toString('base64') }));
  }

  public async remove(key: string) {
    await this.update((entries) => Object.fromEntries(Object.entries(entries).filter(([name]) => name !== key)));
  }

  private async load(): Promise<Record<string, string>> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      );
    } catch {
      return {};
    }
  }

  /** Writes run one at a time and replace the file atomically. */
  private async update(change: (entries: Record<string, string>) => Record<string, string>) {
    const next = this.queue.then(async () => {
      const entries = change(await this.load());
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporary = `${this.filePath}.tmp`;
      await writeFile(temporary, JSON.stringify(entries), { mode: 0o600 });
      await rename(temporary, this.filePath);
    });
    this.queue = next.catch(() => undefined);
    await next;
  }
}
