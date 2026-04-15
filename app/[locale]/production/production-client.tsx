'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { CaretLeft, CaretRight, ShoppingCart } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/table-pagination'
import { addWeeks, formatWeekLabel } from '@/lib/utils'
import { updateProductionMeal } from './actions'
import { ShoppingListSheet } from './shopping-list-sheet'
import type { ProductionRow } from '@/lib/types'

interface Props {
  rows: ProductionRow[]
  allMeals: { id: string; name: string }[]
  week: string
  thisWeekMonday: string
  page: number
  pageSize: number
  totalCount: number
}


export function ProductionClient({
  rows,
  allMeals,
  week,
  thisWeekMonday,
  page,
  pageSize,
  totalCount,
}: Props) {
  const t = useTranslations('production')
  const router = useRouter()
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)

  async function handleMealChange(rowId: string, mealId: string) {
    setSavingRowId(rowId)
    await updateProductionMeal(rowId, mealId)
    setSavingRowId(null)
    setEditingRowId(null)
    router.refresh()
  }

  function productionHref(w: string) {
    return `/production?week=${w}`
  }

  function navigate(direction: -1 | 1) {
    router.push(productionHref(addWeeks(week, direction)))
  }

  const tableRows =
    totalCount === 0
      ? []
      : rows.slice((page - 1) * pageSize, page * pageSize)

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
                onClick={() => navigate(-1)}
              >
                <CaretLeft size={16} />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {formatWeekLabel(week)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer shrink-0"
                onClick={() => navigate(1)}
              >
                <CaretRight size={16} />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer shrink-0 shadow-none"
              onClick={() => {
                if (week === thisWeekMonday) {
                  router.push('/production')
                } else {
                  router.push(productionHref(thisWeekMonday))
                }
              }}
            >
              {t('thisWeek')}
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer shrink-0 gap-1.5"
          onClick={() => setShoppingOpen(true)}
        >
          <ShoppingCart size={14} />
          {t('shoppingList')}
        </Button>
      </div>

      <ShoppingListSheet
        open={shoppingOpen}
        onOpenChange={setShoppingOpen}
        rows={rows}
        week={week}
      />

      {/* Production table */}
      {totalCount === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          {t('noRows')}
        </p>
      ) : (
        <Table className="table-fixed text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[6%]">{t('table.orderNumber')}</TableHead>
              <TableHead className="w-[14%]">{t('table.customer')}</TableHead>
              <TableHead className="w-[16%]">{t('table.meal')}</TableHead>
              <TableHead className="w-[16%]">{t('table.protein')}</TableHead>
              <TableHead className="w-[16%]">{t('table.base')}</TableHead>
              <TableHead className="w-[12%]">{t('table.side')}</TableHead>
              <TableHead className="w-[20%]">{t('table.notes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map(row => {
              const customer = row.orders?.customers
              const meal = row.meals
              const order = row.orders
              const customerName = customer
                ? `${customer.first_name} ${customer.last_name}`
                : '—'
              const proteinName = meal?.protein?.name ?? '—'
              const portionSizeG = order?.portion_size_g
              const baseName = meal?.base?.name ?? '—'
              const sideName = meal?.side?.name ?? '—'
              const notes = order?.notes ?? ''
              const hasAllergy = notes.toUpperCase().includes('ALLERG')

              return (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground">
                    #{order?.order_number ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium truncate">{customerName}</TableCell>
                  <TableCell className="truncate">
                    {editingRowId === row.id ? (
                      <select
                        autoFocus
                        defaultValue={meal?.id ?? ''}
                        disabled={savingRowId === row.id}
                        onChange={e => handleMealChange(row.id, e.target.value)}
                        onBlur={() => setEditingRowId(null)}
                        className="w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {allMeals.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingRowId(row.id)}
                        className="text-left w-full truncate hover:underline cursor-pointer"
                        title="Click to change meal"
                      >
                        {meal?.name ?? '—'}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="truncate">
                    {proteinName}
                    {portionSizeG != null && (
                      <span className="ml-1 text-muted-foreground">({portionSizeG}g)</span>
                    )}
                  </TableCell>
                  <TableCell className="truncate">
                    <span className={row.flag_base_portion ? 'text-red-600 font-medium' : ''}>
                      {baseName}
                      {' '}
                      <span className={row.flag_base_portion ? 'text-red-500' : 'text-muted-foreground'}>
                        ({row.base_portion_size_g}g{row.flag_base_portion ? ' !' : ''})
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="truncate">{sideName}</TableCell>
                  <TableCell className={hasAllergy ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                    {notes || '—'}
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
        totalCount={totalCount}
        preserveParams={{
          ...(week !== thisWeekMonday ? { week } : {}),
        }}
        pinToViewport
      />
    </div>
  )
}
