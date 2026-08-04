import { EVENTS } from '@fardeen/types';
import type { Role } from '@fardeen/types';

/** Domain event payloads (docs/API-CONTRACTS.md §Event channels). The application builds these and
 *  emits them through the EventPublisher port; the Redis adapter wraps them in the DomainEvent
 *  envelope. Consumers arrive in Phase 4c. */

export interface UserRegisteredData {
  userId: string;
  email: string;
  role: Role;
}

export interface UserRoleChangedData {
  userId: string;
  previousRole: Role;
  newRole: Role;
}

export const AUTH_EVENTS = {
  userRegistered: EVENTS.userRegistered,
  userRoleChanged: EVENTS.userRoleChanged,
} as const;
