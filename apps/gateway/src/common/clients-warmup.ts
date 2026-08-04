import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENTS } from '@fardeen/types';

/** Eagerly connect every ClientProxy at boot so the first real request never pays a cold-start
 *  connection (which otherwise races and can fail). Best-effort — a service that is not up yet
 *  reconnects lazily on first use. */
@Injectable()
export class ClientsWarmup implements OnApplicationBootstrap {
  constructor(
    @Inject(SERVICE_CLIENTS.auth) private readonly auth: ClientProxy,
    @Inject(SERVICE_CLIENTS.cms) private readonly cms: ClientProxy,
    @Inject(SERVICE_CLIENTS.project) private readonly project: ClientProxy,
    @Inject(SERVICE_CLIENTS.service) private readonly service: ClientProxy,
    @Inject(SERVICE_CLIENTS.contact) private readonly contact: ClientProxy,
    @Inject(SERVICE_CLIENTS.quotation) private readonly quotation: ClientProxy,
    @Inject(SERVICE_CLIENTS.media) private readonly media: ClientProxy,
    @Inject(SERVICE_CLIENTS.admin) private readonly admin: ClientProxy,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await Promise.allSettled(
      [
        this.auth,
        this.cms,
        this.project,
        this.service,
        this.contact,
        this.quotation,
        this.media,
        this.admin,
      ].map((c) => c.connect()),
    );
  }
}
