import { ApiError } from './errors';



/** File Purpose : Behave like a real network: slow, sometimes too slow, and cancellable. */

/** Tunables for the fake network. Tests set latency to 0 via `configureMock`. */
export const mockConfig = {
  minLatencyMs: 500,
  maxLatencyMs: 1200,
  /** Client-side request timeout. */
  timeoutMs: 6000,
};

export function configureMock(overrides: Partial<typeof mockConfig>) {
  Object.assign(mockConfig, overrides);
}

export function randomLatency(): number {
  const { minLatencyMs: min, maxLatencyMs: max } = mockConfig;
  return min + Math.round(Math.random() * Math.max(0, max - min));
}

/** setTimeout as a promise that rejects immediately if the signal aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError('ABORTED'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new ApiError('ABORTED'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Runs a request with a hard timeout. The task receives an AbortSignal so work is
 * actually cancelled (not just ignored) when the timeout fires or the caller aborts.
 */
export async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? mockConfig.timeoutMs);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    return await task(controller.signal);
  } catch (error) {
    if (timedOut) throw new ApiError('TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
}
