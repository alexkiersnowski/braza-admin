'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatWeekLabel } from '@/lib/utils'
import type { ProductionRow } from '@/lib/types'

type ShoppingItem = {
  name: string
  rawG: number
  unit: 'g'
}

type ShoppingList = {
  proteins: ShoppingItem[]
  bases: ShoppingItem[]
  sides: ShoppingItem[]
}

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`
  return `${Math.round(grams)} g`
}

function buildShoppingList(rows: ProductionRow[]): ShoppingList {
  const proteinMap: Record<string, number> = {}
  const baseMap: Record<string, number> = {}
  const sideMap: Record<string, number> = {}

  for (const row of rows) {
    const meal = row.meals
    const order = row.orders

    // Protein: raw weight = cooked (portion_size_g) ÷ yield_factor
    const proteinName = meal?.protein?.name
    if (proteinName && order?.portion_size_g != null) {
      const yf = meal?.protein?.yield_factor ?? 1
      proteinMap[proteinName] = (proteinMap[proteinName] ?? 0) + (order.portion_size_g / yf)
    }

    // Base: raw weight = cooked (base_portion_size_g) ÷ yield_factor
    const baseName = meal?.base?.name
    if (baseName) {
      const yf = meal?.base?.yield_factor ?? 1
      baseMap[baseName] = (baseMap[baseName] ?? 0) + (row.base_portion_size_g / yf)
    }

    // Side: expand into constituent ingredients
    const sideIngredients = meal?.side?.side_recipe_ingredients ?? []
    for (const sri of sideIngredients) {
      const ingName = sri.ingredients?.name
      if (ingName) {
        sideMap[ingName] = (sideMap[ingName] ?? 0) + sri.portion_size_g
      }
    }
  }

  const proteins: ShoppingItem[] = Object.entries(proteinMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rawG]) => ({ name, rawG, unit: 'g' }))

  const bases: ShoppingItem[] = Object.entries(baseMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rawG]) => ({ name, rawG, unit: 'g' }))

  const sides: ShoppingItem[] = Object.entries(sideMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rawG]) => ({ name, rawG, unit: 'g' }))

  return { proteins, bases, sides }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: ProductionRow[]
  week: string
}

export function ShoppingListSheet({ open, onOpenChange, rows, week }: Props) {
  const t = useTranslations('production')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset checkboxes on close
      setCheckedItems({})
    }
    onOpenChange(next)
  }

  function toggleCheck(key: string) {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const list = buildShoppingList(rows)

  function buildCopyText(): string {
    const lines: string[] = []

    if (list.proteins.length > 0) {
      lines.push(t('sectionProteins'))
      for (const item of list.proteins) {
        lines.push(`${item.name} — ${formatWeight(item.rawG)}`)
      }
    }

    if (list.bases.length > 0) {
      if (lines.length > 0) lines.push('')
      lines.push(t('sectionBases'))
      for (const item of list.bases) {
        lines.push(`${item.name} — ${formatWeight(item.rawG)}`)
      }
    }

    if (list.sides.length > 0) {
      if (lines.length > 0) lines.push('')
      lines.push(t('sectionSides'))
      for (const item of list.sides) {
        lines.push(`${item.name} — ${formatWeight(item.rawG)}`)
      }
    }

    return lines.join('\n')
  }

  async function handleCopyAll() {
    const text = buildCopyText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalItems = list.proteins.length + list.bases.length + list.sides.length

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" style={{ maxWidth: '420px' }} className="flex flex-col">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-0">
          <SheetTitle>{t('shoppingListTitle', { week: formatWeekLabel(week) })}</SheetTitle>
          <p className="text-xs text-muted-foreground mt-1">{t('shoppingListSubtitle')}</p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {totalItems === 0 ? (
            <p className="text-xs text-muted-foreground">{t('noItems')}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {list.proteins.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('sectionProteins')}
                  </h3>
                  <ul className="space-y-1.5">
                    {list.proteins.map(item => {
                      const key = `protein:${item.name}`
                      const checked = checkedItems[key] ?? false
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={checked}
                            onChange={() => toggleCheck(key)}
                            className="cursor-pointer accent-primary shrink-0"
                          />
                          <label
                            htmlFor={key}
                            className={[
                              'text-xs cursor-pointer select-none flex-1',
                              checked ? 'line-through text-muted-foreground' : 'text-foreground',
                            ].join(' ')}
                          >
                            {item.name}
                            <span className="text-muted-foreground ml-1.5 tabular-nums">
                              — {formatWeight(item.rawG)}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {list.bases.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('sectionBases')}
                  </h3>
                  <ul className="space-y-1.5">
                    {list.bases.map(item => {
                      const key = `base:${item.name}`
                      const checked = checkedItems[key] ?? false
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={checked}
                            onChange={() => toggleCheck(key)}
                            className="cursor-pointer accent-primary shrink-0"
                          />
                          <label
                            htmlFor={key}
                            className={[
                              'text-xs cursor-pointer select-none flex-1',
                              checked ? 'line-through text-muted-foreground' : 'text-foreground',
                            ].join(' ')}
                          >
                            {item.name}
                            <span className="text-muted-foreground ml-1.5 tabular-nums">
                              — {formatWeight(item.rawG)}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {list.sides.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('sectionSides')}
                  </h3>
                  <ul className="space-y-1.5">
                    {list.sides.map(item => {
                      const key = `side:${item.name}`
                      const checked = checkedItems[key] ?? false
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={checked}
                            onChange={() => toggleCheck(key)}
                            className="cursor-pointer accent-primary shrink-0"
                          />
                          <label
                            htmlFor={key}
                            className={[
                              'text-xs cursor-pointer select-none flex-1',
                              checked ? 'line-through text-muted-foreground' : 'text-foreground',
                            ].join(' ')}
                          >
                            {item.name}
                            <span className="text-muted-foreground ml-1.5 tabular-nums">
                              — {formatWeight(item.rawG)}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <div className="shrink-0 px-6 py-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer gap-1.5 shadow-none"
              onClick={handleCopyAll}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Copy size={14} />
                  {t('copyAll')}
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
