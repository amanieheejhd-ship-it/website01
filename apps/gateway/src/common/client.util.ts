import type { ClientProxy } from '@nestjs/microservices';
import type { Result } from '@fardeen/types';
import { firstValueFrom } from 'rxjs';
import { DomainHttpError } from './domain-http.error';

/** Send a message pattern to a service and unwrap the Result<T> (err → mapped HTTP via the filter). */
export async function callService<T>(
  client: ClientProxy,
  pattern: string,
  payload: unknown,
): Promise<T> {
  const result = await firstValueFrom(client.send<Result<T>>(pattern, payload));
  if (!result.ok) throw new DomainHttpError(result.error);
  return result.data;
}
