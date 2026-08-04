import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  type LoginPayload,
  type LogoutPayload,
  type MePayload,
  type RefreshPayload,
  type RegisterPayload,
} from '@fardeen/types';
import { GetMe } from '../application/use-cases/get-me.use-case';
import { LoginUser } from '../application/use-cases/login-user.use-case';
import { Logout } from '../application/use-cases/logout.use-case';
import { RefreshToken } from '../application/use-cases/refresh-token.use-case';
import { RegisterUser } from '../application/use-cases/register-user.use-case';

/** Delivery layer: TCP message handlers. Each returns Result<T> (docs/API-CONTRACTS.md §2). */
@Controller()
export class AuthMessageController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly refreshToken: RefreshToken,
    private readonly logout: Logout,
    private readonly getMe: GetMe,
  ) {}

  @MessagePattern(AUTH_PATTERNS.register)
  register(@Payload() payload: RegisterPayload) {
    return this.registerUser.execute(payload);
  }

  @MessagePattern(AUTH_PATTERNS.login)
  login(@Payload() payload: LoginPayload) {
    return this.loginUser.execute(payload);
  }

  @MessagePattern(AUTH_PATTERNS.refresh)
  refresh(@Payload() payload: RefreshPayload) {
    return this.refreshToken.execute(payload);
  }

  @MessagePattern(AUTH_PATTERNS.logout)
  logoutHandler(@Payload() payload: LogoutPayload) {
    return this.logout.execute(payload);
  }

  @MessagePattern(AUTH_PATTERNS.me)
  me(@Payload() payload: MePayload) {
    return this.getMe.execute(payload);
  }
}
