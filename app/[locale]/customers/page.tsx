import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase/server'
import { CustomersTable } from './customers-table'
import { CustomersSearch } from './customers-search'
import { AddCustomerSheet } from './add-customer-sheet'
import { TablePagination } from '@/components/table-pagination'
import {
  TABLE_PAGE_SIZE,
  parsePageParam,
  clampPage,
  rangeForPage,
} from '@/lib/pagination'
import {
  parseCustomerSearchQuery,
  customerSearchTokens,
  applyCustomerSearchTokenFilters,
} from '@/lib/customer-search'
import type { Customer, Meal } from '@/lib/types'

function getThisWeekMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = (day + 6) % 7 // days since Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  return monday.toISOString().split('T')[0]
}

interface MetricCardProps {
  label: string
  value: number | string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="bg-muted rounded-lg p-4">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="text-[22px] font-semibold text-foreground mt-1">{value}</p>
    </div>
  )
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const t = await getTranslations('customers')
  const { page: pageRaw, q: qRaw } = await searchParams
  const supabase = createServerClient()
  const thisMonday = getThisWeekMonday()

  const q = parseCustomerSearchQuery(qRaw)
  const searchTokens = q ? customerSearchTokens(q) : []

  const { count: totalCustomerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  const totalCustomersUnfiltered = totalCustomerCount ?? 0

  let listCountQuery = supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
  if (searchTokens.length > 0) {
    listCountQuery = applyCustomerSearchTokenFilters(listCountQuery, searchTokens)
  }
  const { count: listMatchCount } = await listCountQuery

  const totalForList = listMatchCount ?? 0
  const requestedPage = parsePageParam(pageRaw)
  const page = clampPage(requestedPage, totalForList, TABLE_PAGE_SIZE)

  if (requestedPage !== page) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (page > 1) p.set('page', String(page))
    redirect(p.toString() ? `/customers?${p.toString()}` : '/customers')
  }

  const { from, to } = rangeForPage(page, TABLE_PAGE_SIZE)

  let customersListQuery = supabase
    .from('customers')
    .select('*, customer_meal_exclusions(meal_id, meals(id, name))')
  if (searchTokens.length > 0) {
    customersListQuery = applyCustomerSearchTokenFilters(
      customersListQuery,
      searchTokens,
    )
  }
  customersListQuery = customersListQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  const [
    { data: customersPage },
    { count: performanceCount },
    { count: standardCount },
    { count: ordersThisWeekCount },
    { data: mealsData },
  ] = await Promise.all([
    customersListQuery,
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'performance'),
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'standard'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('week_start', thisMonday),
    supabase
      .from('meals')
      .select('id, name')
      .order('name'),
  ])

  // Map Supabase join shape → excluded_meals: { id, name }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customers: Customer[] = (customersPage ?? []).map((c: any) => ({
    ...c,
    excluded_meals: (c.customer_meal_exclusions ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => ({ id: e.meals?.id ?? e.meal_id, name: e.meals?.name ?? '' })
    ),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <AddCustomerSheet meals={(mealsData ?? []) as Pick<Meal, 'id' | 'name'>[]} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard label={t('metrics.total')} value={totalCustomersUnfiltered} />
        <MetricCard label={t('metrics.performance')} value={performanceCount ?? 0} />
        <MetricCard label={t('metrics.standard')} value={standardCount ?? 0} />
        <MetricCard label={t('metrics.ordersThisWeek')} value={ordersThisWeekCount ?? 0} />
      </div>

      <CustomersSearch key={`${q ?? ''}:${page}`} defaultQuery={q ?? ''} />

      <CustomersTable customers={customers} />
      <TablePagination
        page={page}
        pageSize={TABLE_PAGE_SIZE}
        totalCount={totalForList}
        preserveParams={q ? { q } : {}}
        pinToViewport
      />
    </div>
  )
}
