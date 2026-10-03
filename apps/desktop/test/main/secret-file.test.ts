import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { SecretFile } from '../../src/main/secret-file';

/** Reverses the bytes, so a stored value never equals the secret. */
function fakeCipher(isAvailable = true) {
  return {
    isAvailable: () => isAvailable,
    encrypt: (value: string) => Buffer.from(value, 'utf8').reverse(),
    decrypt: (value: Buffer) => Buffer.from(value).reverse().toString('utf8'),
  };
}

function secretPath() {
  return path.join(mkdtempSync(path.join(tmpdir(), 'chaff-secrets-')), 'secrets.json');
}

describe('SecretFile', () => {
  it('stores secrets encrypted and reads them back', async () => {
    const filePath = secretPath();
    const secrets = new SecretFile(filePath, fakeCipher());

    await Promise.all([secrets.write('connection:a', 'glpat-one'), secrets.write('connection:b', 'ghp-two')]);

    expect(readFileSync(filePath, 'utf8')).not.toContain('glpat-one');
    expect(await new SecretFile(filePath, fakeCipher()).read('connection:a')).toBe('glpat-one');
    expect(await secrets.read('connection:b')).toBe('ghp-two');
  });

  it('forgets a removed secret', async () => {
    const secrets = new SecretFile(secretPath(), fakeCipher());
    await secrets.write('connection:a', 'glpat-one');

    await secrets.remove('connection:a');

    expect(await secrets.read('connection:a')).toBeNull();
  });

  it('refuses to store anything when the OS cannot encrypt', async () => {
    const secrets = new SecretFile(secretPath(), fakeCipher(false));

    await expect(secrets.write('connection:a', 'glpat-one')).rejects.toThrow();
    expect(await secrets.read('connection:a')).toBeNull();
  });
});
