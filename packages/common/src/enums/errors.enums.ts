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
});
