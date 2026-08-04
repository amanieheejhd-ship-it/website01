import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENTS } from '@fardeen/types';

/** Eagerly open every downstream TCP connection at boot so the first dashboard fan-out doesn't race. */
@Injectable()
export class AdminClientsWarmup implements OnApplicationBootstrap {
  private readonly clients: ClientProxy[];

  constructor(
    @Inject(SERVICE_CLIENTS.project) project: ClientProxy,
    @Inject(SERVICE_CLIENTS.service) service: ClientProxy,
    @Inject(SERVICE_CLIENTS.cms) cms: ClientProxy,
    @Inject(SERVICE_CLIENTS.contact) contact: ClientProxy,
    @Inject(SERVICE_CLIENTS.quotation) quotation: ClientProxy,
    @Inject(SERVICE_CLIENTS.media) media: ClientProxy,
  ) {
    this.clients = [project, service, cms, contact, quotation, media];
  }

  async onApplicationBootstrap(): Promise<void> {
    await Promise.allSettled(this.clients.map((c) => c.connect()));
  }
}
