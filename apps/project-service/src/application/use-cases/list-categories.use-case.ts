import { type CategoryDto, ok, type Result } from '@fardeen/types';
import type { CategoryRepository } from '../../domain/repositories/project.repository';
import { toCategoryDto } from '../mappers/project.mapper';

export class ListCategories {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<Result<CategoryDto[]>> {
    const items = await this.categories.listOrdered();
    return ok(items.map(toCategoryDto));
  }
}
