'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { confirmOrder } from './actions'
import { EditOrderSheet } from './edit-order-sheet'
import { AddOrderSheet } from '@/app/[locale]/customers/add-order-sheet'
import { addWeeks, formatWeekLabel, orderAddressTableCell } from '@/lib/utils'
import { TablePagination } from '@/components/table-pagination'
import { OrdersSearch } from './orders-search'
import type { Order, Customer } from '@/lib/types'

function ordersHref(week: string, q: string) {
  const params = new URLSearchParams()
  params.set('week', week)
  const t = q.trim()
  if (t) params.set('q', t)
  return `/orders?${params.toString()}`
}

export type OrderWithCustomer = Order & {
  customers: {
    first_name: string
    last_name: string
    whatsapp_number: string
  } | null
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


export function OrdersClient({
  orders,
  selectedWeek,
  thisWeekMonday,
  customers,
  page,
  pageSize,
  totalOrdersForWeek,
  totalOrdersForList,
  totalMealsForWeek,
  confirmedCountForWeek,
  pendingCountForWeek,
  searchQuery,
}: {
  orders: OrderWithCustomer[]
  selectedWeek: string
  thisWeekMonday: string
  customers: Customer[]
  page: number
  pageSize: number
  totalOrdersForWeek: number
  totalOrdersForList: number
  totalMealsForWeek: number
  confirmedCountForWeek: number
  pendingCountForWeek: number
  searchQuery: string
}) {
  const t = useTranslations('orders')
  const router = useRouter()
  const [editingOrder, setEditingOrder] = useState<OrderWithCustomer | null>(null)

  async function handleConfirmClick(e: React.MouseEvent, order: OrderWithCustomer) {
    e.stopPropagation()
    const { error } = await confirmOrder(order.id)
    router.refresh()
    if (error) alert(`Order confirmed, but production rows failed to generate:\n${error}`)
  }

  function handleEditSaved() {
    setEditingOrder(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground shrink-0">{t('title')}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer shrink-0"
                onClick={() =>
                  router.push(
                    ordersHref(addWeeks(selectedWeek, -1), searchQuery),
                  )
                }
              >
                <CaretLeft size={16} />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {formatWeekLabel(selectedWeek)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer shrink-0"
                onClick={() =>
                  router.push(
                    ordersHref(addWeeks(selectedWeek, 1), searchQuery),
                  )
                }
              >
                <CaretRight size={16} />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer shrink-0 shadow-none"
              onClick={() => {
                const sq = searchQuery.trim()
                if (selectedWeek === thisWeekMonday) {
                  router.push(sq ? `/orders?q=${encodeURIComponent(sq)}` : '/orders')
                } else {
                  router.push(ordersHref(thisWeekMonday, searchQuery))
                }
              }}
            >
              {t('thisWeek')}
            </Button>
          </div>
        </div>
        <AddOrderSheet customers={customers} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard label={t('metrics.totalOrders')} value={totalOrdersForWeek} />
        <MetricCard label={t('metrics.totalMeals')} value={totalMealsForWeek} />
        <MetricCard label={t('metrics.confirmed')} value={confirmedCountForWeek} />
        <MetricCard label={t('metrics.pending')} value={pendingCountForWeek} />
      </div>

      <OrdersSearch
        key={`${searchQuery}:${page}:${selectedWeek}`}
        defaultQuery={searchQuery}
        selectedWeek={selectedWeek}
      />

      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          {searchQuery.trim()
            ? t('table.emptySearch')
            : t('table.empty')}
        </p>
      ) : (
        <Table className="table-fixed text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[5%] max-w-0 min-w-0 truncate">{t('table.number')}</TableHead>
              <TableHead className="w-[14%] max-w-0 min-w-0 truncate">{t('table.customer')}</TableHead>
              <TableHead className="w-[14%] max-w-0 min-w-0 truncate">{t('table.phone')}</TableHead>
              <TableHead className="w-[6%] max-w-0 min-w-0 truncate">{t('table.meals')}</TableHead>
              <TableHead className="w-[7%] max-w-0 min-w-0 truncate">{t('table.portion')}</TableHead>
              <TableHead className="w-[7%] max-w-0 min-w-0 truncate">{t('table.price')}</TableHead>
              <TableHead className="w-[8%] max-w-0 min-w-0 truncate">{t('table.deliveryType')}</TableHead>
              <TableHead className="w-[12%] max-w-0 min-w-0 truncate">{t('table.address')}</TableHead>
              <TableHead className="w-[12%] max-w-0 min-w-0 truncate">{t('table.status')}</TableHead>
              <TableHead className="w-[15%] max-w-0 min-w-0 truncate">{t('table.notes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(o => {
              const customerName = o.customers
                ? `${o.customers.first_name} ${o.customers.last_name}`
                : '—'
              const address = orderAddressTableCell(o.delivery_type, o.delivery_address)

              return (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setEditingOrder(o)}
                >
                  <TableCell className="max-w-0 min-w-0 truncate text-muted-foreground tabular-nums">
                    #{o.order_number}
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate">
                    <Link
                      href={`/customers/${o.customer_id}`}
                      className="block min-w-0 truncate text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {customerName}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate tabular-nums">
                    <span className="block min-w-0 truncate">
                      {o.customers?.whatsapp_number ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate tabular-nums">
                    <span className="block min-w-0 truncate">{o.meals_per_week}</span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate tabular-nums">
                    <span className="block min-w-0 truncate">{o.portion_size_g}g</span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate tabular-nums">
                    <span className="block min-w-0 truncate">{o.price_pln} zł</span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate">
                    <span className="block min-w-0 truncate">
                      {t(`deliveryType.${o.delivery_type}`)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate">
                    <span className="block min-w-0 truncate">{address}</span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0">
                    <span className="flex min-w-0">
                      {o.status === 'pending' ? (
                        <Badge
                          variant="pending"
                          onClick={e => handleConfirmClick(e, o)}
                          className="min-w-0 max-w-full cursor-pointer justify-center truncate"
                          title={t('status.clickToConfirm')}
                        >
                          {t('status.pending')}
                        </Badge>
                      ) : (
                        <Badge
                          variant={o.status}
                          className="min-w-0 max-w-full justify-center truncate"
                        >
                          {t(`status.${o.status}`)}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0 min-w-0 truncate text-muted-foreground">
                    <span className="block min-w-0 truncate">{o.notes ?? ''}</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalOrdersForList}
        preserveParams={{
          week: selectedWeek,
          ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
        }}
        pinToViewport
      />

      <EditOrderSheet
        order={editingOrder}
        open={!!editingOrder}
        onOpenChange={v => !v && setEditingOrder(null)}
        onSaved={handleEditSaved}
      />
    </div>
  )
}
