import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import {
  AUTH_PATTERNS,
  loginSchema,
  registerSchema,
  SERVICE_CLIENTS,
  type AccessToken,
  type LoginDto,
  type LoginResult,
  type RefreshResult,
  type RegisterDto,
  type Result,
  type UserProfile,
} from '@fardeen/types';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DomainHttpError } from '../common/domain-http.error';
import type { FardeenRequest } from '../common/http';
import { ZodBody } from '../common/zod-body.pipe';
import { GATEWAY_CONFIG, type GatewayConfig } from '../config/env';

/**
 * Public auth REST surface (base /api/v1). Translates HTTP ⇄ AUTH_PATTERNS over the ClientProxy;
 * the refresh token only ever lives in an httpOnly cookie. Stricter rate limit on all /auth/*.
 */
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(
    @Inject(SERVICE_CLIENTS.auth) private readonly auth: ClientProxy,
    @Inject(GATEWAY_CONFIG) private readonly cfg: GatewayConfig,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async register(
    @Body(new ZodBody(registerSchema)) body: RegisterDto,
    @Req() req: FardeenRequest,
  ): Promise<UserProfile> {
    return this.unwrap(
      await this.send<UserProfile>(AUTH_PATTERNS.register, { ...body, correlationId: req.correlationId }),
    );
  }

  @Post('login')
  async login(
    @Body(new ZodBody(loginSchema)) body: LoginDto,
    @Req() req: FardeenRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessToken> {
    const data = this.unwrap(
      await this.send<LoginResult>(AUTH_PATTERNS.login, {
        ...body,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId,
      }),
    );
    this.setRefreshCookie(res, data.refreshToken);
    return data.access;
  }

  @Post('refresh')
  async refresh(
    @Req() req: FardeenRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessToken> {
    const token = req.cookies?.[this.cfg.refreshCookieName];
    if (!token) {
      throw new DomainHttpError({ code: 'REFRESH_INVALID', message: 'Missing refresh cookie' });
    }
    const result = await this.send<RefreshResult>(AUTH_PATTERNS.refresh, {
      refreshToken: token,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
    });
    if (!result.ok) {
      this.clearRefreshCookie(res);
      throw new DomainHttpError(result.error);
    }
    this.setRefreshCookie(res, result.data.refreshToken);
    return result.data.access;
  }

  @Post('logout')
  async logout(
    @Req() req: FardeenRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = req.cookies?.[this.cfg.refreshCookieName];
    if (token) {
      await this.send(AUTH_PATTERNS.logout, { refreshToken: token });
    }
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: FardeenRequest): Promise<UserProfile> {
    return this.unwrap(await this.send<UserProfile>(AUTH_PATTERNS.me, { userId: req.user!.sub }));
  }

  // ---- helpers ----
  private send<T>(pattern: string, payload: unknown): Promise<Result<T>> {
    return firstValueFrom(this.auth.send<Result<T>>(pattern, payload));
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) throw new DomainHttpError(result.error);
    return result.data;
  }

  private cookiePath(): string {
    return `/${this.cfg.globalPrefix}/auth`;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(this.cfg.refreshCookieName, token, {
      httpOnly: true,
      secure: this.cfg.isProd, // dev is http → Secure would block the cookie; prod is https
      sameSite: 'strict',
      path: this.cookiePath(),
      maxAge: this.cfg.refreshTtlSeconds * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.cfg.refreshCookieName, { path: this.cookiePath() });
  }
}
