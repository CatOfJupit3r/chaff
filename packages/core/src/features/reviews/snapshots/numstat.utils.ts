/**
 * Reads `git diff --numstat -z`. A rename is written as an empty path followed by the old and new paths;
 * binary files count as zero lines.
 */
export function parseNumstat(output: string) {
  const fields = output.split('\0');
  const files: { path: string; additions: number; deletions: number }[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const match = /^(-|\d+)\t(-|\d+)\t(.*)$/s.exec(fields[index] ?? '');
    if (!match) continue;
    let filePath = match[3] ?? '';
    if (filePath === '') {
      filePath = fields[index + 2] ?? '';
      index += 2;
    }
    files.push({
      path: filePath,
      additions: match[1] === '-' ? 0 : Number(match[1]),
      deletions: match[2] === '-' ? 0 : Number(match[2]),
    });
  }
  return files;
}
