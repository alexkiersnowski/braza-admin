import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getThisWeekMonday } from '@/lib/utils'
import {
  parseCustomerSearchQuery,
  customerSearchTokens,
} from '@/lib/customer-search'
import {
  getOrdersSearchOrClauses,
  applyOrdersSearchOrClauses,
} from '@/lib/order-search'
import { OrdersClient, type OrderWithCustomer } from './orders-client'
import type { Customer } from '@/lib/types'
import {
  TABLE_PAGE_SIZE,
  parsePageParam,
  clampPage,
  rangeForPage,
} from '@/lib/pagination'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; page?: string; q?: string }>
}) {
  const { week, page: pageRaw, q: qRaw } = await searchParams
  const thisWeekMonday = getThisWeekMonday()
  const selectedWeek = week ?? thisWeekMonday
  const supabase = createServerClient()

  const q = parseCustomerSearchQuery(qRaw)
  const tokens = q ? customerSearchTokens(q) : []

  const { count: ordersWeekCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('week_start', selectedWeek)

  const totalForWeek = ordersWeekCount ?? 0

  let listFilterClauses: string[] | null = null
  let totalForList = totalForWeek

  if (tokens.length > 0) {
    listFilterClauses = await getOrdersSearchOrClauses(supabase, tokens)
    if (listFilterClauses === null) {
      totalForList = 0
    } else {
      let listCountQuery = supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('week_start', selectedWeek)
      listCountQuery = applyOrdersSearchOrClauses(listCountQuery, listFilterClauses)
      const { count } = await listCountQuery
      totalForList = count ?? 0
    }
  }

  const requestedPage = parsePageParam(pageRaw)
  const page = clampPage(requestedPage, totalForList, TABLE_PAGE_SIZE)

  if (requestedPage !== page) {
    const p = new URLSearchParams()
    p.set('week', selectedWeek)
    if (q) p.set('q', q)
    if (page > 1) p.set('page', String(page))
    redirect(`/orders?${p.toString()}`)
  }

  const { from, to } = rangeForPage(page, TABLE_PAGE_SIZE)

  let orders: OrderWithCustomer[] = []
  if (tokens.length > 0 && listFilterClauses === null) {
    orders = []
  } else {
    let ordersQuery = supabase
      .from('orders')
      .select('*, customers(first_name, last_name, whatsapp_number)')
      .eq('week_start', selectedWeek)
    if (tokens.length > 0 && listFilterClauses) {
      ordersQuery = applyOrdersSearchOrClauses(ordersQuery, listFilterClauses)
    }
    const { data: ordersPage } = await ordersQuery
      .order('created_at', { ascending: false })
      .range(from, to)
    orders = (ordersPage ?? []) as OrderWithCustomer[]
  }

  const [
    { data: customers },
    { count: confirmedCount },
    { count: pendingCount },
    { data: mealRows },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .order('first_name', { ascending: true }),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('week_start', selectedWeek)
      .eq('status', 'confirmed'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('week_start', selectedWeek)
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('meals_per_week')
      .eq('week_start', selectedWeek),
  ])

  const totalMeals = (mealRows ?? []).reduce(
    (s, r) => s + Number(r.meals_per_week),
    0,
  )

  return (
    <div>
      <OrdersClient
        orders={orders}
        selectedWeek={selectedWeek}
        thisWeekMonday={thisWeekMonday}
        customers={(customers ?? []) as Customer[]}
        page={page}
        pageSize={TABLE_PAGE_SIZE}
        totalOrdersForWeek={totalForWeek}
        totalOrdersForList={totalForList}
        totalMealsForWeek={totalMeals}
        confirmedCountForWeek={confirmedCount ?? 0}
        pendingCountForWeek={pendingCount ?? 0}
        searchQuery={q ?? ''}
      />
    </div>
  )
}
