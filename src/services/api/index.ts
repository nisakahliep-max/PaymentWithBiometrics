import type { RecipientChannel } from '@/features/recipients/types';
import type { TransferRequest } from '@/features/transfer/types';

import { mockServer } from './mockServer';
import { withTimeout } from './simulate';

/**
 * The only API surface the app talks to. Every call has a timeout and accepts an
 * AbortSignal. Swapping the mock for a real backend means re-implementing these
 * five functions with fetch — no screen or store changes.
 */
export const api = {
  getAccount: (signal?: AbortSignal) => withTimeout((s) => mockServer.getAccount(s), { signal }),
  listRecipients: (signal?: AbortSignal) => withTimeout((s) => mockServer.listRecipients(s), { signal }),
  listTransactions: (signal?: AbortSignal) => withTimeout((s) => mockServer.listTransactions(s), { signal }),
  lookupRecipient: (channel: RecipientChannel, value: string, signal?: AbortSignal) =>
    withTimeout((s) => mockServer.lookupRecipient(channel, value, s), { signal }),
  submitTransfer: (request: TransferRequest, signal?: AbortSignal) =>
    withTimeout((s) => mockServer.submitTransfer(request, s), { signal }),
};

export { ApiError, isApiError, toUserFacingError, type UserFacingError } from './errors';
export { DEMO_AMOUNTS } from './mockServer';
