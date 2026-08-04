import { Injectable } from '@nestjs/common';
import type { ContactStatus } from '@fardeen/types';
import { ContactSubmission } from '../../domain/entities/contact-submission.entity';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Phone } from '../../domain/value-objects/phone.vo';
import { PrismaService } from './prisma.service';

interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: string;
  idempotencyKey: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class PrismaContactRepository implements ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(key: string): Promise<ContactSubmission | null> {
    const r = await this.prisma.contactSubmission.findUnique({ where: { idempotencyKey: key } });
    return r ? this.toDomain(r) : null;
  }

  async findById(id: string): Promise<ContactSubmission | null> {
    const r = await this.prisma.contactSubmission.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async save(s: ContactSubmission): Promise<void> {
    const data = {
      name: s.name,
      email: s.email.value,
      phone: s.phone.value,
      subject: s.subject,
      message: s.message,
      source: s.source,
      idempotencyKey: s.idempotencyKey,
      status: s.status,
    };
    await this.prisma.contactSubmission.upsert({
      where: { id: s.id },
      create: { id: s.id, ...data, createdAt: s.createdAt },
      update: { status: s.status },
    });
  }

  async list(filter: {
    status?: ContactStatus;
    page: number;
    limit: number;
  }): Promise<{ items: ContactSubmission[]; total: number }> {
    const where = filter.status ? { status: filter.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);
    return { items: rows.map((r: ContactRow) => this.toDomain(r)), total };
  }

  private toDomain(r: ContactRow): ContactSubmission {
    return ContactSubmission.rehydrate({
      id: r.id,
      name: r.name,
      email: Email.create(r.email),
      phone: Phone.create(r.phone),
      subject: r.subject,
      message: r.message,
      source: r.source,
      idempotencyKey: r.idempotencyKey,
      status: r.status as ContactStatus,
      createdAt: r.createdAt,
    });
  }
}
