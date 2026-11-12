/**
 * Typed API errors. The UI never inspects raw messages — it switches on `code`,
 * so copy can change (or be localised) without touching logic.
 */
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INSUFFICIENT_FUNDS'
  | 'LIMIT_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'RECIPIENT_NOT_FOUND'
  | 'SERVER_ERROR'
  | 'ABORTED';

/** Transient failures the user can safely retry (same idempotency key is reused). */
const RETRYABLE: ReadonlySet<ApiErrorCode> = new Set(['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR']);

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = RETRYABLE.has(code);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export interface UserFacingError {
  code: ApiErrorCode | 'UNKNOWN';
  title: string;
  message: string;
  retryable: boolean;
}

const COPY: Record<ApiErrorCode, Omit<UserFacingError, 'code' | 'retryable'>> = {
  NETWORK_ERROR: {
    title: 'No connection',
    message: 'We couldn’t reach the bank. Check your internet connection and try again — you won’t be charged twice.',
  },
  TIMEOUT: {
    title: 'This is taking longer than usual',
    message: 'The bank didn’t respond in time. Retrying is safe: if the first attempt went through, it won’t be repeated.',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Insufficient balance',
    message: 'Your balance changed and no longer covers this transfer. We’ve refreshed it for you.',
  },
  LIMIT_EXCEEDED: {
    title: 'Over your transfer limit',
    message: 'This amount is above your per-transfer limit. Try a smaller amount.',
  },
  INVALID_REQUEST: {
    title: 'Something isn’t right',
    message: 'Please check the transfer details and try again.',
  },
  RECIPIENT_NOT_FOUND: {
    title: 'Recipient not found',
    message: 'No account is registered to that number. Double-check it with the recipient.',
  },
  SERVER_ERROR: {
    title: 'Service temporarily unavailable',
    message: 'The bank’s system had a problem. Please try again in a moment.',
  },
  ABORTED: {
    title: 'Cancelled',
    message: 'The request was cancelled.',
  },
};

/** Maps anything thrown into copy the UI can show. Unknown errors never leak internals. */
export function toUserFacingError(error: unknown): UserFacingError {
  if (isApiError(error)) {
    return { code: error.code, retryable: error.retryable, ...COPY[error.code] };
  }
  return {
    code: 'UNKNOWN',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
}
