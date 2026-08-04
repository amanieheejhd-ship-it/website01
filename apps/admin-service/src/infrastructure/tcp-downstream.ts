import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { type Result, SERVICE_CLIENTS } from '@fardeen/types';
import { firstValueFrom } from 'rxjs';
import type { Downstream, DownstreamService } from '../application/ports/downstream.port';

/** TCP adapter for the Downstream port — one ClientProxy per owning service. */
@Injectable()
export class TcpDownstream implements Downstream {
  private readonly clients: Record<DownstreamService, ClientProxy>;

  constructor(
    @Inject(SERVICE_CLIENTS.project) project: ClientProxy,
    @Inject(SERVICE_CLIENTS.service) service: ClientProxy,
    @Inject(SERVICE_CLIENTS.cms) cms: ClientProxy,
    @Inject(SERVICE_CLIENTS.contact) contact: ClientProxy,
    @Inject(SERVICE_CLIENTS.quotation) quotation: ClientProxy,
    @Inject(SERVICE_CLIENTS.media) media: ClientProxy,
  ) {
    this.clients = { project, service, cms, contact, quotation, media };
  }

  call<T>(service: DownstreamService, pattern: string, payload: unknown): Promise<Result<T>> {
    return firstValueFrom(this.clients[service].send<Result<T>>(pattern, payload));
  }
}
