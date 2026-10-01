import { ORPCError } from '@orpc/client';

const FALLBACK_MESSAGE = 'Something went wrong';

function hasMessage(value: unknown): value is { message: string } {
  return typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string';
}

/** The core's own message for a failed call (for example "This folder is not a git repository"). */
export function getErrorMessage(error: unknown) {
  if (error instanceof ORPCError && hasMessage(error.data)) return error.data.message;
  if (error instanceof Error && error.message) return error.message;
  return FALLBACK_MESSAGE;
}
