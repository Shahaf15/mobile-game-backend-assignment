/**
 * Token Bucket Rate Limiter
 *
 * Controls the rate at which the worker can perform database writes.
 * Tokens are consumed on each batch write and refill at a steady rate.
 * If tokens are insufficient, the caller waits until enough are available.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefillTime = now;
  }

  async acquire(count: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }

    const deficit = count - this.tokens;
    const waitMs = (deficit / this.refillRate) * 1000;

    await new Promise((resolve) => setTimeout(resolve, waitMs));

    this.tokens = 0;
    this.lastRefillTime = Date.now();
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
