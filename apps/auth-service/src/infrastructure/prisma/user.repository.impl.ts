import { Injectable } from '@nestjs/common';
import type { Role, UserStatus } from '@fardeen/types';
import { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { PrismaService } from './prisma.service';

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.value } });
    return row ? this.toDomain(row) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email: email.value } });
    return count > 0;
  }

  async save(user: User): Promise<void> {
    const data = {
      email: user.email.value,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, ...data },
      update: { role: user.role, status: user.status, passwordHash: user.passwordHash },
    });
  }

  private toDomain(row: UserRow): User {
    return User.rehydrate({
      id: row.id,
      email: Email.create(row.email),
      passwordHash: row.passwordHash,
      role: row.role as Role,
      status: row.status as UserStatus,
      createdAt: row.createdAt,
    });
  }
}
