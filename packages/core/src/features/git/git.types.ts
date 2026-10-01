export interface iGitRunOptions {
  /** Resolve with the non-zero exit code instead of throwing. */
  allowFailure?: boolean;
  env?: Record<string, string>;
  /** Written to stdin. */
  input?: string;
}

export interface iGitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface iGitBufferResult {
  stdout: Buffer;
  stderr: string;
  exitCode: number;
}
