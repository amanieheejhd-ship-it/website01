import type { AccessToken, Role } from '@fardeen/types';

export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');

export interface TokenSigner {
  /** Sign a short-TTL RS256 access token (verified locally at the gateway with the public key). */
  sign(subject: { id: string; email: string; role: Role }): Promise<AccessToken>;
}
