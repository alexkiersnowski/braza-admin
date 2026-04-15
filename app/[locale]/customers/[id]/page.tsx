import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  TABLE_PAGE_SIZE,
  parsePageParam,
  clampPage,
  rangeForPage,
} from '@/lib/pagination'
import { CustomerForm } from './customer-form'
import type { Customer, Meal, Order } from '@/lib/types'

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page: pageRaw } = await searchParams
  const supabase = createServerClient()

  const [
    { data: customerRaw },
    { count: ordersTotalCount },
    { data: mealsData },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('*, customer_meal_exclusions(meal_id, meals(id, name))')
      .eq('id', id)
      .single(),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id),
    supabase
      .from('meals')
      .select('id, name')
      .order('name'),
  ])

  if (!customerRaw) notFound()

  // Map Supabase join shape → excluded_meals: { id, name }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer: Customer = {
    ...customerRaw,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    excluded_meals: (customerRaw.customer_meal_exclusions ?? []).map((e: any) => ({
      id: e.meals?.id ?? e.meal_id,
      name: e.meals?.name ?? '',
    })),
  }

  const totalOrders = ordersTotalCount ?? 0
  const requestedPage = parsePageParam(pageRaw)
  const page = clampPage(requestedPage, totalOrders, TABLE_PAGE_SIZE)

  if (requestedPage !== page) {
    const p = new URLSearchParams()
    if (page > 1) p.set('page', String(page))
    redirect(p.toString() ? `/customers/${id}?${p.toString()}` : `/customers/${id}`)
  }

  const { from, to } = rangeForPage(page, TABLE_PAGE_SIZE)

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <CustomerForm
      customer={customer}
      meals={(mealsData ?? []) as Pick<Meal, 'id' | 'name'>[]}
      orders={(orders ?? []) as Order[]}
      page={page}
      pageSize={TABLE_PAGE_SIZE}
      totalOrdersCount={totalOrders}
    />
  )
}
