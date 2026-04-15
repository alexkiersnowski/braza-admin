/** Fixed page size for admin table lists (Customers, Orders, Meals → Ingredients). */
export const TABLE_PAGE_SIZE = 100

export function parsePageParam(raw: string | string[] | undefined): number {
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = parseInt(s ?? '1', 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function totalPages(totalCount: number | null | undefined, pageSize: number): number {
  const n = totalCount ?? 0
  if (n === 0) return 1
  return Math.max(1, Math.ceil(n / pageSize))
}

export function clampPage(
  page: number,
  totalCount: number | null | undefined,
  pageSize: number,
): number {
  const max = totalPages(totalCount, pageSize)
  return Math.min(Math.max(1, page), max)
}

export function rangeForPage(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { from, to }
}
