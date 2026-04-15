import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { sortProductionRows } from '@/lib/sort-production-rows'
import { getThisWeekMonday } from '@/lib/utils'
import {
  TABLE_PAGE_SIZE,
  parsePageParam,
  clampPage,
} from '@/lib/pagination'
import { ProductionClient } from './production-client'
import type { ProductionRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; page?: string }>
}) {
  const sp = await searchParams
  const thisWeekMonday = getThisWeekMonday()
  const week = sp.week ?? thisWeekMonday
  const pageRaw = sp.page

  const supabase = createServerClient()

  const [{ data: rows }, { data: allMeals }] = await Promise.all([
    supabase
      .from('production')
      .select(
        '*, orders(*, customers(first_name, last_name)), meals(*, protein:ingredients!protein_id(*), base:ingredients!base_id(*), side:side_recipes!sides_id(*, side_recipe_ingredients(*, ingredients(*))))'
      )
      .eq('week_start', week),
    supabase
      .from('meals')
      .select('id, name')
      .order('name'),
  ])

  const sortedRows = sortProductionRows((rows ?? []) as ProductionRow[])
  const totalForList = sortedRows.length
  const requestedPage = parsePageParam(pageRaw)
  const page = clampPage(requestedPage, totalForList, TABLE_PAGE_SIZE)

  if (requestedPage !== page) {
    const p = new URLSearchParams()
    if (week !== thisWeekMonday) p.set('week', week)
    if (page > 1) p.set('page', String(page))
    redirect(p.toString() ? `/production?${p.toString()}` : '/production')
  }

  return (
    <ProductionClient
      rows={sortedRows}
      allMeals={(allMeals ?? []) as { id: string; name: string }[]}
      week={week}
      thisWeekMonday={thisWeekMonday}
      page={page}
      pageSize={TABLE_PAGE_SIZE}
      totalCount={totalForList}
    />
  )
}
