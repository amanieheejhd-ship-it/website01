import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/** Validates a request body against a shared @fardeen/types Zod schema (contracts-as-code). */
export class ZodBody<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.issues,
      });
    }
    return parsed.data;
  }
}
