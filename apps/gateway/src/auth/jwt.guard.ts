import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AccessTokenClaims } from '@fardeen/types';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { GATEWAY_CONFIG, type GatewayConfig } from '../config/env';
import type { FardeenRequest } from '../common/http';

/** Verifies the RS256 access token LOCALLY with the public key (no round-trip to auth-service,
 *  ADR-004) and attaches the claims to req.user. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(GATEWAY_CONFIG) private readonly cfg: GatewayConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FardeenRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Missing bearer token' });
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = jwt.verify(token, this.cfg.jwtPublicKey, {
        algorithms: ['RS256'],
        issuer: this.cfg.jwtIssuer,
        audience: this.cfg.jwtAudience,
      }) as JwtPayload & AccessTokenClaims;

      req.user = {
        sub: String(claims.sub),
        email: claims.email,
        role: claims.role,
        type: claims.type,
      };
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
  }
}
