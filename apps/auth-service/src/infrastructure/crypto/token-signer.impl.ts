import jwt from 'jsonwebtoken';
import type { AccessToken, Role } from '@fardeen/types';
import type { TokenSigner } from '../../application/ports/token-signer.port';

export interface TokenSignerConfig {
  privateKey: string;
  ttlSeconds: number;
  issuer: string;
  audience: string;
}

/** RS256 access-token signer. The gateway verifies with the public key locally (ADR-004). */
export class Rs256TokenSigner implements TokenSigner {
  constructor(private readonly cfg: TokenSignerConfig) {}

  async sign(subject: { id: string; email: string; role: Role }): Promise<AccessToken> {
    const accessToken = jwt.sign(
      { email: subject.email, role: subject.role, type: 'access' },
      this.cfg.privateKey,
      {
        algorithm: 'RS256',
        subject: subject.id,
        expiresIn: this.cfg.ttlSeconds,
        issuer: this.cfg.issuer,
        audience: this.cfg.audience,
      },
    );
    return { accessToken, tokenType: 'Bearer', expiresIn: this.cfg.ttlSeconds };
  }
}
