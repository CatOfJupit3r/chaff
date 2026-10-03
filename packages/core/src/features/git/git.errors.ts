export class GitCommandError extends Error {
  constructor(
    public readonly args: string[],
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(`git ${args[0] ?? ''} exited with code ${exitCode}: ${stderr.trim().split('\n')[0] ?? ''}`);
    this.name = 'GitCommandError';
  }
}
