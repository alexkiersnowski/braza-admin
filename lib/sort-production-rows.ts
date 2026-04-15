import type { ProductionRow } from '@/lib/types'

/** Same ordering as the production table: customer name, then meal name. */
export function sortProductionRows(rows: ProductionRow[]): ProductionRow[] {
  return [...rows].sort((a, b) => {
    const aName = `${a.orders?.customers?.last_name ?? ''} ${a.orders?.customers?.first_name ?? ''}`
    const bName = `${b.orders?.customers?.last_name ?? ''} ${b.orders?.customers?.first_name ?? ''}`
    const nameCmp = aName.localeCompare(bName)
    if (nameCmp !== 0) return nameCmp
    return (a.meals?.name ?? '').localeCompare(b.meals?.name ?? '')
  })
}
