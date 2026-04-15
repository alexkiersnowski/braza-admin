'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/table-pagination'
import { MEALS_INGREDIENTS_PAGE_PARAM } from '@/lib/meals-search'
import { cn } from '@/lib/utils'
import { createIngredient, updateIngredient, deleteIngredient } from './actions'
import { DeleteWithConfirm } from '@/components/delete-with-confirm'
import { MealsTabNameSearch } from './meals-tab-name-search'
import type { Ingredient, IngredientType } from '@/lib/types'

const FW = 'flex w-full min-w-0 flex-col gap-1.5'
const SHEET_SELECT_CONTENT_CLASS =
  'min-w-[var(--radix-select-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

type FormState = {
  name: string
  type: IngredientType
  cooked_kcal_per_100g: string
  yield_factor: string
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'protein',
  cooked_kcal_per_100g: '',
  yield_factor: '1',
}

function ingredientToForm(i: Ingredient): FormState {
  return {
    name: i.name,
    type: i.type,
    cooked_kcal_per_100g: i.cooked_kcal_per_100g != null ? String(i.cooked_kcal_per_100g) : '',
    yield_factor: String(i.yield_factor ?? 1),
  }
}

// TYPE_LABELS is now built from translations inside the component

export function IngredientsTab({
  ingredients,
  searchQuery,
  page,
  pageSize,
  totalCount,
  paginationPreserveParams,
}: {
  ingredients: Ingredient[]
  searchQuery: string
  page: number
  pageSize: number
  totalCount: number
  paginationPreserveParams: Record<string, string>
}) {
  const t = useTranslations('meals')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const TYPE_LABELS: Record<IngredientType, string> = {
    protein: t('ingredients.protein'),
    base: t('ingredients.base'),
    side: t('ingredients.side'),
  }

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setFormData(EMPTY_FORM)
    setSaveError(null)
    setOpen(true)
  }

  function openEdit(i: Ingredient) {
    setEditing(i)
    setFormData(ingredientToForm(i))
    setSaveError(null)
    setOpen(true)
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData(prev => ({
      ...prev,
      [key]: value,
      // Clear kcal when switching to side type — it's not relevant for side ingredients
      ...(key === 'type' && value === 'side' ? { cooked_kcal_per_100g: '' } : {}),
    }))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      cooked_kcal_per_100g: formData.type === 'side' || formData.cooked_kcal_per_100g === ''
        ? null
        : Number(formData.cooked_kcal_per_100g),
      cooked_protein_g_per_100g: null,
      yield_factor: formData.yield_factor === '' ? 1 : Number(formData.yield_factor),
    }
    if (editing) {
      const { error } = await updateIngredient(editing.id, payload)
      setIsSaving(false)
      if (error) { setSaveError(error); return }
    } else {
      const { error } = await createIngredient(payload)
      setIsSaving(false)
      if (error) { setSaveError(error); return }
    }
    setOpen(false)
    router.refresh()
  }

  const needsKcal = formData.type === 'protein' || formData.type === 'base'
  const isSaveDisabled = !formData.name.trim() || (needsKcal && !formData.cooked_kcal_per_100g.trim()) || isSaving

  const hasSearch = searchQuery.trim().length > 0

  return (
    <div>
      <div className="mb-4 flex w-full min-w-0 items-center">
        <MealsTabNameSearch
          key={`${searchQuery}:${page}`}
          paramKey="ingredients_q"
          defaultQuery={searchQuery}
          placeholder={t('ingredientsList.searchPlaceholder')}
          countLabel={t('ingredientsList.countLabel', { count: totalCount })}
        />
        <div className="min-h-0 min-w-0 flex-1" aria-hidden />
        <Button size="sm" className="shrink-0 cursor-pointer" onClick={openAdd}>
          {t('ingredients.addIngredient')}
        </Button>
      </div>

      {totalCount === 0 && !hasSearch ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t('ingredientsList.noIngredients')}</p>
      ) : totalCount === 0 && hasSearch ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t('ingredientsList.noIngredientsSearch')}</p>
      ) : (
        <Table className="table-fixed text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[26%]">{t('ingredients.name')}</TableHead>
              <TableHead className="w-[13%]">{t('ingredients.type')}</TableHead>
              <TableHead className="w-[18%]">{t('ingredientsList.kcalPer100g')}</TableHead>
              <TableHead className="w-[13%]">{t('ingredientsList.yieldFactorCol')}</TableHead>
              <TableHead className="w-[22%]">{t('ingredientsList.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map(i => (
              <TableRow
                key={i.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openEdit(i)}
              >
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell>
                  <Badge variant={i.type}>{TYPE_LABELS[i.type]}</Badge>
                </TableCell>
                <TableCell>{i.cooked_kcal_per_100g ?? '—'}</TableCell>
                <TableCell className="tabular-nums">{i.yield_factor !== 1 ? i.yield_factor : <span className="text-muted-foreground">1</span>}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(i.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalCount > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          preserveParams={paginationPreserveParams}
          pageQueryKey={MEALS_INGREDIENTS_PAGE_PARAM}
          pinToViewport
        />
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ maxWidth: '520px' }} className="flex flex-col">
          <SheetHeader
            className={cn(
              'shrink-0 px-6 pt-4 pb-0',
              editing && 'flex flex-row items-center gap-2 pr-14',
            )}
          >
            <SheetTitle className={cn(editing && 'min-w-0 flex-1')}>
              {editing ? t('ingredientsList.editIngredient') : t('ingredients.addIngredient')}
            </SheetTitle>
            {editing && (
              <div className="shrink-0">
                <DeleteWithConfirm
                  itemLabel={editing.name}
                  labels={{
                    deleteItem: t('ingredientsList.deleteIngredient'),
                    confirmTitle: t('ingredientsList.deleteIngredientTitle'),
                    confirmDescription: t('ingredientsList.deleteIngredientDescription'),
                    confirmButton: tCommon('delete'),
                    cancelButton: tCommon('cancel'),
                    deleting: tCommon('deleting'),
                  }}
                  onConfirm={async () => {
                    const { error } = await deleteIngredient(editing.id)
                    if (error) { setSaveError(error); throw new Error(error) }
                    setOpen(false)
                    router.refresh()
                  }}
                />
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5">

              <div className={FW}>
                <Label>{t('ingredients.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder={t('ingredientsList.placeholder')}
                />
              </div>

              <div className={FW}>
                <Label>{t('ingredients.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={v => handleChange('type', v as IngredientType)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                    <SelectItem value="protein">{t('ingredients.protein')}</SelectItem>
                    <SelectItem value="base">{t('ingredients.base')}</SelectItem>
                    <SelectItem value="side">{t('ingredients.side')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {needsKcal && (
                <div className={FW}>
                  <Label>{t('ingredientsList.cookedKcal')} <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.cooked_kcal_per_100g}
                    onChange={e => handleChange('cooked_kcal_per_100g', e.target.value)}
                    placeholder={t('ingredientsList.required')}
                  />
                </div>
              )}

              <div className={FW}>
                <Label>{t('ingredientsList.yieldFactor')}</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={formData.yield_factor}
                  onChange={e => handleChange('yield_factor', e.target.value)}
                  placeholder="1.0"
                />
                <p className="text-xs text-muted-foreground">{t('ingredientsList.yieldFactorHint')}</p>
              </div>

            </div>
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-border">
            {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
            <Button
              type="button"
              className="w-full cursor-pointer"
              disabled={isSaveDisabled}
              onClick={handleSave}
            >
              {isSaving ? tCommon('saving') : editing ? t('ingredientsList.saveChanges') : t('ingredients.addIngredient')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
