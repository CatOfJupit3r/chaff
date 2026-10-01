import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

const errorCodesEnumwaii = new Enumwaii('ErrorCode', [
  'USER_NOT_FOUND',
  'UNAUTHORIZED',
  'INTERNAL_SERVER_ERROR',
  'AUTH_SERVICE_NOT_INITIALIZED',
]);

export const errorCodes = errorCodesEnumwaii.enum;
export type ErrorCodesType = InferEnumwaii<typeof errorCodesEnumwaii>;

export const errorMessages = errorCodesEnumwaii.derive({
  [errorCodes.USER_NOT_FOUND]: 'User not found',
  [errorCodes.UNAUTHORIZED]: 'User is not authenticated',
  [errorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected server error occurred',
  [errorCodes.AUTH_SERVICE_NOT_INITIALIZED]: 'AuthService not initialized. Call connect() first.',
});
