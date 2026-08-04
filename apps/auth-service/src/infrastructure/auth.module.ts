import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EVENT_PUBLISHER } from '../application/ports/event-publisher.port';
import { PASSWORD_HASHER } from '../application/ports/password-hasher.port';
import { REFRESH_SESSION_STORE } from '../application/ports/refresh-session.store';
import { TOKEN_SIGNER } from '../application/ports/token-signer.port';
import { GetMe } from '../application/use-cases/get-me.use-case';
import { LoginUser } from '../application/use-cases/login-user.use-case';
import { Logout } from '../application/use-cases/logout.use-case';
import { RefreshToken } from '../application/use-cases/refresh-token.use-case';
import { RegisterUser } from '../application/use-cases/register-user.use-case';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import { AuthMessageController } from '../presentation/auth.controller';
import { AUTH_CONFIG, loadConfig, type AuthConfig } from './config/env';
import { BcryptPasswordHasher } from './crypto/password-hasher.impl';
import { Rs256TokenSigner } from './crypto/token-signer.impl';
import { PrismaService } from './prisma/prisma.service';
import { PrismaUserRepository } from './prisma/user.repository.impl';
import { RedisEventPublisher } from './redis/event-publisher.impl';
import { RedisRefreshSessionStore } from './redis/refresh-session.store.impl';
import { REDIS_CLIENT } from './redis/redis.tokens';

/**
 * Composition root: binds application/domain PORTS → infrastructure ADAPTERS. Use-cases are plain
 * framework-free classes constructed here via useFactory, so domain/ and application/ never import
 * Nest/Prisma/Redis (docs/ARCHITECTURE.md §5).
 */
@Module({
  controllers: [AuthMessageController],
  providers: [
    { provide: AUTH_CONFIG, useFactory: loadConfig },

    // adapters
    {
      provide: PrismaService,
      useFactory: (cfg: AuthConfig) => new PrismaService(cfg.authDatabaseUrl),
      inject: [AUTH_CONFIG],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: (cfg: AuthConfig) =>
        new Redis({
          host: cfg.redisHost,
          port: cfg.redisPort,
          password: cfg.redisPassword,
          maxRetriesPerRequest: null,
        }),
      inject: [AUTH_CONFIG],
    },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: PASSWORD_HASHER,
      useFactory: (cfg: AuthConfig) => new BcryptPasswordHasher(cfg.bcryptRounds),
      inject: [AUTH_CONFIG],
    },
    {
      provide: TOKEN_SIGNER,
      useFactory: (cfg: AuthConfig) =>
        new Rs256TokenSigner({
          privateKey: cfg.jwtPrivateKey,
          ttlSeconds: cfg.jwtAccessTtl,
          issuer: cfg.jwtIssuer,
          audience: cfg.jwtAudience,
        }),
      inject: [AUTH_CONFIG],
    },
    {
      provide: REFRESH_SESSION_STORE,
      useFactory: (redis: Redis, cfg: AuthConfig) =>
        new RedisRefreshSessionStore(redis, cfg.refreshTtlSeconds),
      inject: [REDIS_CLIENT, AUTH_CONFIG],
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (redis: Redis) => new RedisEventPublisher(redis),
      inject: [REDIS_CLIENT],
    },

    // use-cases (framework-free, wired from ports)
    {
      provide: RegisterUser,
      useFactory: (repo, hasher, events) => new RegisterUser(repo, hasher, events),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, EVENT_PUBLISHER],
    },
    {
      provide: LoginUser,
      useFactory: (repo, hasher, signer, sessions) => new LoginUser(repo, hasher, signer, sessions),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SIGNER, REFRESH_SESSION_STORE],
    },
    {
      provide: RefreshToken,
      useFactory: (sessions, repo, signer) => new RefreshToken(sessions, repo, signer),
      inject: [REFRESH_SESSION_STORE, USER_REPOSITORY, TOKEN_SIGNER],
    },
    {
      provide: Logout,
      useFactory: (sessions) => new Logout(sessions),
      inject: [REFRESH_SESSION_STORE],
    },
    {
      provide: GetMe,
      useFactory: (repo) => new GetMe(repo),
      inject: [USER_REPOSITORY],
    },
  ],
})
export class AuthModule {}
