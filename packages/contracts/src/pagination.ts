import { z } from 'zod';

/** Storefront lists: page numbers are SEO-friendly and catalogs are small (PLAN §9.3). */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});

/** Admin tables and logs: keyset pagination on (created_at, id). */
export const cursorQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const pageInfoSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const cursorInfoSchema = z.object({
  nextCursor: z.string().nullable(),
  limit: z.number().int(),
});

export function pagedSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), page: pageInfoSchema });
}

export function cursorPagedSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), page: cursorInfoSchema });
}

export type PageQuery = z.infer<typeof pageQuerySchema>;
export type CursorQuery = z.infer<typeof cursorQuerySchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;

export function toPageInfo(query: PageQuery, total: number): PageInfo {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
