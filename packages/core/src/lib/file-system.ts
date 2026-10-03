import { access, stat } from 'node:fs/promises';

export async function pathExists(target: string) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(target: string) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}
