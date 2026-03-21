import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BatchProcessor } from '../batch-processor';
import { TokenBucketRateLimiter } from '../rate-limiter';
import { Semaphore } from '../semaphore';

// Prevent the batch-processor from touching MongoDB
vi.mock('../models/log.model', () => ({
  Log: { insertMany: vi.fn().mockResolvedValue([]) },
}));

import { Log } from '../models/log.model';

function makeProcessor(batchSize = 5, batchTimeoutMs = 100) {
  const rateLimiter = new TokenBucketRateLimiter(1000, 1000);
  const semaphore = new Semaphore(5);
  return new BatchProcessor(batchSize, batchTimeoutMs, rateLimiter, semaphore);
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    logData: { playerId: 'p1', logData: 'test event', level: 'info', ...overrides },
    ack: vi.fn(),
    nack: vi.fn(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(Log.insertMany).mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('BatchProcessor', () => {
  it('flushes when buffer reaches batchSize', async () => {
    const processor = makeProcessor(3);
    const messages = [makeMessage(), makeMessage(), makeMessage()];
    messages.forEach((m) => processor.add(m));

    await vi.runAllTimersAsync();

    expect(Log.insertMany).toHaveBeenCalledOnce();
    messages.forEach((m) => expect(m.ack).toHaveBeenCalledOnce());
  });

  it('flushes after batchTimeoutMs when buffer is not full', async () => {
    const processor = makeProcessor(10, 200);
    const msg = makeMessage();
    processor.add(msg);

    expect(Log.insertMany).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();

    expect(Log.insertMany).toHaveBeenCalledOnce();
    expect(msg.ack).toHaveBeenCalledOnce();
  });

  it('maps logData field to message field in the document', async () => {
    const processor = makeProcessor(1);
    const msg = makeMessage({ logData: 'click event', action: 'click' });
    processor.add(msg);
    await vi.runAllTimersAsync();

    expect(Log.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ message: 'click event', action: 'click' }),
      ]),
      { ordered: false }
    );
  });

  it('nacks all messages in batch on DB error', async () => {
    vi.mocked(Log.insertMany).mockRejectedValueOnce(new Error('DB down'));
    const processor = makeProcessor(2);
    const m1 = makeMessage();
    const m2 = makeMessage();
    processor.add(m1);
    processor.add(m2);
    await vi.runAllTimersAsync();

    expect(m1.nack).toHaveBeenCalledWith(true);
    expect(m2.nack).toHaveBeenCalledWith(true);
    expect(m1.ack).not.toHaveBeenCalled();
  });

  it('getStats returns correct counters', async () => {
    const processor = makeProcessor(2);
    processor.add(makeMessage());
    processor.add(makeMessage());
    await vi.runAllTimersAsync();

    const stats = processor.getStats();
    expect(stats.flushCount).toBe(1);
    expect(stats.totalProcessed).toBe(2);
    expect(stats.bufferSize).toBe(0);
  });

  it('serialises concurrent flush calls (no double-flush race)', async () => {
    const processor = makeProcessor(5, 50);
    // Add 10 messages — should trigger two flushes of 5 each
    Array.from({ length: 10 }, () => makeMessage()).forEach((m) => processor.add(m));
    await vi.runAllTimersAsync();

    // insertMany called exactly twice, each time with 5 docs
    expect(Log.insertMany).toHaveBeenCalledTimes(2);
    expect((Log.insertMany as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(5);
    expect((Log.insertMany as ReturnType<typeof vi.fn>).mock.calls[1][0]).toHaveLength(5);
  });
});
