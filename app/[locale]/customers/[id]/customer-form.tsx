'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
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
import { AddCustomerSheet } from '../add-customer-sheet'
import { AddOrderSheet } from '../add-order-sheet'
import { EditOrderSheet } from '@/app/[locale]/orders/edit-order-sheet'
import { confirmOrder } from '@/app/[locale]/orders/actions'
import { STANDARD_DEFAULT_PORTION_G } from '@/lib/customer-constants'
import { BASE_PRICE_PLN } from '@/lib/calculations'
import { formatMultilineTextForDisplay, orderAddressTableCell } from '@/lib/utils'
import { TablePagination } from '@/components/table-pagination'
import type { Customer, Meal, Order } from '@/lib/types'
import type { OrderWithCustomer } from '@/app/[locale]/orders/orders-client'

interface CustomerFormProps {
  customer: Customer
  meals: Pick<Meal, 'id' | 'name'>[]
  orders: Order[]
  page: number
  pageSize: number
  totalOrdersCount: number
}

const sectionHeadingClass =
  'text-[11px] font-medium text-muted-foreground uppercase tracking-wider'

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-xs text-foreground">
        {children ?? <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  )
}

export function CustomerForm({
  customer,
  meals,
  orders,
  page,
  pageSize,
  totalOrdersCount,
}: CustomerFormProps) {
  const router = useRouter()
  const [data, setData] = useState<Customer>(customer)
  const [editingOrder, setEditingOrder] = useState<OrderWithCustomer | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  const ordersWithCustomer: OrderWithCustomer[] = orders.map(o => ({
    ...o,
    customers: {
      first_name: customer.first_name,
      last_name: customer.last_name,
      whatsapp_number: customer.whatsapp_number,
    },
  }))

  function handleRowClick(o: OrderWithCustomer) {
    setEditingOrder(o)
    setEditSheetOpen(true)
  }

  async function handleConfirmClick(e: React.MouseEvent, o: OrderWithCustomer) {
    e.stopPropagation()
    await confirmOrder(o.id)
    router.refresh()
  }

  const exclusions = data.excluded_meals?.map(m => m.name).join(', ') || null

  return (
    <div className="w-full max-w-none">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground hover:text-foreground">
        <Link href="/customers">
          <ArrowLeft />
          Customers
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-foreground">
              {data.first_name} {data.last_name}
            </h1>
            <Badge variant={data.type}>
              {data.type.charAt(0).toUpperCase() + data.type.slice(1)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMultilineTextForDisplay(data.whatsapp_number) ?? '—'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AddOrderSheet customer={data} />
          <AddCustomerSheet customer={data} meals={meals} onSaved={setData} />
        </div>
      </div>

      <div className="border border-border rounded-2xl p-6 sm:p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
          <div className="flex flex-col gap-5">
            <DetailField label="WhatsApp">
              {formatMultilineTextForDisplay(data.whatsapp_number)}
            </DetailField>
            <DetailField label="Exclusions">{exclusions}</DetailField>
          </div>
          <div className="flex flex-col gap-5">
            <DetailField label="Address">{formatMultilineTextForDisplay(data.address)}</DetailField>
            <DetailField label="Allergies">{formatMultilineTextForDisplay(data.allergies)}</DetailField>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-muted p-5 sm:p-6">
          <h2 className={sectionHeadingClass}>
            {data.type === 'performance' ? 'Performance' : 'Standard'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 mt-4">
            <DetailField label="Protein portion size">
              {data.type === 'performance'
                ? (data.protein_portion_size_g != null ? `${data.protein_portion_size_g} g` : null)
                : `${STANDARD_DEFAULT_PORTION_G} g`}
            </DetailField>
            <DetailField label="Price per meal (PLN)">
              {data.type === 'performance'
                ? (data.price_per_meal_pln != null ? String(data.price_per_meal_pln) : null)
                : String(BASE_PRICE_PLN)}
            </DetailField>
          </div>
        </div>
      </div>

      {/* Orders */}
      <section>
        <h2 className={`${sectionHeadingClass} mb-4`}>Orders</h2>
        {totalOrdersCount === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No orders yet.</p>
        ) : (
          <Table className="table-fixed text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[7%] max-w-0 min-w-0 truncate">#</TableHead>
                <TableHead className="w-[8%] max-w-0 min-w-0 truncate">Meals</TableHead>
                <TableHead className="w-[10%] max-w-0 min-w-0 truncate">Portion</TableHead>
                <TableHead className="w-[10%] max-w-0 min-w-0 truncate">Price</TableHead>
                <TableHead className="w-[10%] max-w-0 min-w-0 truncate">Delivery type</TableHead>
                <TableHead className="w-[15%] max-w-0 min-w-0 truncate">Address</TableHead>
                <TableHead className="w-[16%] max-w-0 min-w-0 truncate">Status</TableHead>
                <TableHead className="w-[24%] max-w-0 min-w-0 truncate">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersWithCustomer.map(o => {
                const address = orderAddressTableCell(o.delivery_type, o.delivery_address)
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(o)}
                  >
                    <TableCell className="max-w-0 min-w-0 truncate text-muted-foreground tabular-nums">
                      #{o.order_number}
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
                        {o.delivery_type.charAt(0).toUpperCase() + o.delivery_type.slice(1)}
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
                            title="Click to confirm"
                          >
                            Pending
                          </Badge>
                        ) : (
                          <Badge
                            variant={o.status}
                            className="min-w-0 max-w-full justify-center truncate"
                          >
                            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
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
          totalCount={totalOrdersCount}
          pinToViewport
        />
      </section>

      <EditOrderSheet
        order={editingOrder}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
