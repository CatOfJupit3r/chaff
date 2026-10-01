import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

const errorCodesEnumwaii = new Enumwaii('ErrorCode', [
  'INTERNAL_SERVER_ERROR',
  'WORKSPACE_NOT_FOUND',
  'WORKSPACE_ALREADY_ADDED',
  'DIRECTORY_NOT_FOUND',
  'NOT_A_GIT_REPOSITORY',
  'GIT_UNAVAILABLE',
  'UNSUPPORTED_EXTERNAL_URL',
  'BRANCH_NOT_FOUND',
  'INVALID_PARENT_BRANCH',
  'NO_COMMON_ANCESTOR',
  'REVIEW_TARGET_NOT_FOUND',
  'SNAPSHOT_NOT_FOUND',
  'SNAPSHOT_FILE_NOT_FOUND',
]);

export const errorCodes = errorCodesEnumwaii.enum;
export type ErrorCodesType = InferEnumwaii<typeof errorCodesEnumwaii>;

export const errorMessages = errorCodesEnumwaii.derive({
  [errorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [errorCodes.WORKSPACE_NOT_FOUND]: 'Repository not found',
  [errorCodes.WORKSPACE_ALREADY_ADDED]: 'This repository is already added',
  [errorCodes.DIRECTORY_NOT_FOUND]: 'Folder not found',
  [errorCodes.NOT_A_GIT_REPOSITORY]: 'This folder is not a git repository',
  [errorCodes.GIT_UNAVAILABLE]: 'git is not installed or not on PATH',
  [errorCodes.UNSUPPORTED_EXTERNAL_URL]: 'This link cannot be opened',
  [errorCodes.BRANCH_NOT_FOUND]: 'Branch not found in the repository',
  [errorCodes.INVALID_PARENT_BRANCH]: 'A branch cannot be reviewed against itself',
  [errorCodes.NO_COMMON_ANCESTOR]: 'The branch and its parent share no history',
  [errorCodes.REVIEW_TARGET_NOT_FOUND]: 'Review not found',
  [errorCodes.SNAPSHOT_NOT_FOUND]: 'Snapshot not found',
  [errorCodes.SNAPSHOT_FILE_NOT_FOUND]: 'File not found in this snapshot',
});
