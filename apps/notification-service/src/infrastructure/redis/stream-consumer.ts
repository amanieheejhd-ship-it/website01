import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import type { DomainEvent } from '@fardeen/types';
import { Redis, type RedisOptions } from 'ioredis';

export type Dispatch = Record<string, (event: DomainEvent) => Promise<void>>;

export interface StreamConsumerConfig {
  redisOptions: RedisOptions;
  group: string;
  consumerName: string;
  eventNames: string[]; // e.g. ['contact.submitted', ...] → streams 'stream:<name>'
  maxAttempts: number;
  blockMs: number;
  batch: number;
  reclaimIdleMs: number;
}

/**
 * Durable event consumer over Redis Streams + a consumer group (docs/ARCHITECTURE.md ADR-002).
 *  - XGROUP CREATE ... MKSTREAM on each stream (idempotent).
 *  - readLoop: XREADGROUP '>' (new messages) → dispatch → XACK on success (no ack → stays pending).
 *  - reclaimLoop: XPENDING (idle + delivery count) → XCLAIM stuck messages and reprocess; after
 *    maxAttempts, dead-letter (XACK to drop). Handlers are idempotent on correlationId.
 * A message XADD'd while this consumer is DOWN is still delivered on restart (pub/sub would lose it).
 */
export class StreamConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly reader: Redis;
  private readonly control: Redis;
  private running = false;

  constructor(
    private readonly cfg: StreamConsumerConfig,
    private readonly dispatch: Dispatch,
  ) {
    this.reader = new Redis({ ...cfg.redisOptions, maxRetriesPerRequest: null });
    this.control = new Redis({ ...cfg.redisOptions, maxRetriesPerRequest: null });
  }

  private streamKey(name: string): string {
    return `stream:${name}`;
  }

  async onApplicationBootstrap(): Promise<void> {
    for (const name of this.cfg.eventNames) {
      try {
        await this.control.xgroup('CREATE', this.streamKey(name), this.cfg.group, '0', 'MKSTREAM');
      } catch (e) {
        if (!String((e as Error).message).includes('BUSYGROUP')) throw e;
      }
    }
    this.running = true;
    void this.readLoop();
    void this.reclaimLoop();
    console.log(
      `[notification] stream consumer '${this.cfg.consumerName}' on group '${this.cfg.group}' → ${this.cfg.eventNames.join(', ')}`,
    );
  }

  onModuleDestroy(): void {
    this.running = false;
    this.reader.disconnect();
    this.control.disconnect();
  }

  private async readLoop(): Promise<void> {
    const streams = this.cfg.eventNames.map((n) => this.streamKey(n));
    while (this.running) {
      try {
        const res = (await this.reader.xreadgroup(
          'GROUP',
          this.cfg.group,
          this.cfg.consumerName,
          'COUNT',
          this.cfg.batch,
          'BLOCK',
          this.cfg.blockMs,
          'STREAMS',
          ...streams,
          ...streams.map(() => '>'),
        )) as Array<[string, Array<[string, string[]]>]> | null;
        if (!res) continue;
        for (const [stream, messages] of res) {
          for (const [id, fields] of messages) {
            await this.handle(stream, id, fields);
          }
        }
      } catch (e) {
        if (this.running) {
          console.error('[notification] read loop error:', (e as Error).message);
          await this.sleep(500);
        }
      }
    }
  }

  private async handle(stream: string, id: string, fields: string[]): Promise<void> {
    const name = stream.replace(/^stream:/, '');
    const idx = fields.indexOf('event');
    if (idx < 0) {
      await this.control.xack(stream, this.cfg.group, id);
      return;
    }
    let event: DomainEvent;
    try {
      event = JSON.parse(fields[idx + 1]) as DomainEvent;
    } catch {
      await this.control.xack(stream, this.cfg.group, id); // poison message → drop
      return;
    }
    const handler = this.dispatch[name];
    if (!handler) {
      await this.control.xack(stream, this.cfg.group, id);
      return;
    }
    try {
      await handler(event);
      await this.control.xack(stream, this.cfg.group, id);
    } catch (e) {
      console.error(`[notification] handler '${name}' failed (${id}) — will retry:`, (e as Error).message);
      // no ack → message stays pending → reclaimLoop retries
    }
  }

  private async reclaimLoop(): Promise<void> {
    while (this.running) {
      await this.sleep(this.cfg.reclaimIdleMs);
      if (!this.running) break;
      for (const name of this.cfg.eventNames) {
        try {
          await this.reclaimStream(this.streamKey(name));
        } catch (e) {
          console.error('[notification] reclaim error:', (e as Error).message);
        }
      }
    }
  }

  private async reclaimStream(stream: string): Promise<void> {
    const pending = (await this.control.xpending(
      stream,
      this.cfg.group,
      'IDLE',
      this.cfg.reclaimIdleMs,
      '-',
      '+',
      20,
    )) as Array<[string, string, number, number]>;

    for (const [id, , , deliveries] of pending) {
      if (Number(deliveries) > this.cfg.maxAttempts) {
        await this.control.xack(stream, this.cfg.group, id); // dead-letter: drop from pending
        console.warn(`[notification] dead-lettered ${stream} ${id} after ${deliveries} attempts`);
        continue;
      }
      const claimed = (await this.control.xclaim(
        stream,
        this.cfg.group,
        this.cfg.consumerName,
        0,
        id,
      )) as Array<[string, string[]]>;
      if (claimed && claimed.length > 0 && claimed[0]) {
        const [claimedId, fields] = claimed[0];
        await this.handle(stream, claimedId, fields);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
