import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBucketRateLimiter } from '../rate-limiter';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('TokenBucketRateLimiter', () => {
  it('starts with full bucket', () => {
    const limiter = new TokenBucketRateLimiter(10, 5);
    expect(limiter.getAvailableTokens()).toBe(10);
  });

  it('immediately grants acquire when tokens are available', async () => {
    const limiter = new TokenBucketRateLimiter(10, 5);
    await expect(limiter.acquire(5)).resolves.toBeUndefined();
    expect(limiter.getAvailableTokens()).toBe(5);
  });

  it('deducts exact token count on acquire', async () => {
    const limiter = new TokenBucketRateLimiter(20, 10);
    await limiter.acquire(7);
    expect(limiter.getAvailableTokens()).toBe(13);
  });

  it('waits when tokens are insufficient then resolves', async () => {
    const limiter = new TokenBucketRateLimiter(5, 10); // refills 10/sec
    await limiter.acquire(5); // drain bucket

    const acquirePromise = limiter.acquire(5); // needs 5 more — wait 500ms
    vi.advanceTimersByTime(500);
    await expect(acquirePromise).resolves.toBeUndefined();
  });

  it('refills tokens over time up to max', async () => {
    const limiter = new TokenBucketRateLimiter(10, 10); // 10 tokens/sec
    await limiter.acquire(10); // drain
    expect(limiter.getAvailableTokens()).toBe(0);

    vi.advanceTimersByTime(1000); // +10 tokens
    expect(limiter.getAvailableTokens()).toBe(10);
  });

  it('does not refill beyond maxTokens', () => {
    const limiter = new TokenBucketRateLimiter(10, 100);
    vi.advanceTimersByTime(5000); // would add 500 tokens
    expect(limiter.getAvailableTokens()).toBe(10);
  });
});
