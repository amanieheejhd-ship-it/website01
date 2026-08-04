/**
 * Server-only category loader for the project forms/list. Categories are PUBLIC reference data and
 * there is no /admin/categories route (backend frozen for 7b), so we read the existing public
 * gateway route server-side via the shared api client. The admin *browser* still only ever calls
 * /api/admin/* — this fetch happens on the Next server. Fails soft to an empty list.
 */
import { getCategories } from '../../../lib/api';
import type { CategoryDto } from '@fardeen/types';

export async function loadCategories(): Promise<CategoryDto[]> {
  try {
    const res = await getCategories();
    return res.data;
  } catch {
    return [];
  }
}
