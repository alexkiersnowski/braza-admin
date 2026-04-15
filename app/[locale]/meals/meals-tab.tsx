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
import { createMeal, updateMeal } from './actions'
import { MealsTabNameSearch } from './meals-tab-name-search'
import type { Ingredient, SideRecipe, Meal } from '@/lib/types'

const FW = 'flex w-full min-w-0 flex-col gap-1.5'
const SHEET_SELECT_CONTENT_CLASS =
  'min-w-[var(--radix-select-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

type FormState = {
  name: string
  protein_id: string
  base_id: string
  sides_id: string
}

const EMPTY_FORM: FormState = {
  name: '',
  protein_id: '',
  base_id: '',
  sides_id: '',
}

function mealToForm(m: Meal): FormState {
  return {
    name: m.name,
    protein_id: m.protein_id,
    base_id: m.base_id,
    sides_id: m.sides_id,
  }
}

interface Props {
  meals: Meal[]
  ingredients: Ingredient[]
  sideRecipes: SideRecipe[]
  searchQuery: string
}

export function MealsTab({ meals, ingredients, sideRecipes, searchQuery }: Props) {
  const t = useTranslations('meals')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const proteins = ingredients.filter(i => i.type === 'protein')
  const bases = ingredients.filter(i => i.type === 'base')

  function openAdd() {
    setEditing(null)
    setFormData(EMPTY_FORM)
    setSaveError(null)
    setOpen(true)
  }

  function openEdit(m: Meal) {
    setEditing(m)
    setFormData(mealToForm(m))
    setSaveError(null)
    setOpen(true)
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    const payload = {
      name: formData.name.trim(),
      protein_id: formData.protein_id,
      base_id: formData.base_id,
      sides_id: formData.sides_id,
    }
    if (editing) {
      const { error } = await updateMeal(editing.id, payload)
      setIsSaving(false)
      if (error) { setSaveError(error); return }
    } else {
      const { error } = await createMeal(payload)
      setIsSaving(false)
      if (error) { setSaveError(error); return }
    }
    setOpen(false)
    router.refresh()
  }

  const isSaveDisabled =
    !formData.name.trim() || !formData.protein_id || !formData.base_id || !formData.sides_id || isSaving

  const hasSearch = searchQuery.trim().length > 0

  return (
    <div>
      <div className="mb-4 flex w-full min-w-0 items-center">
        <MealsTabNameSearch
          paramKey="meals_q"
          defaultQuery={searchQuery}
          placeholder={t('mealsList.searchPlaceholder')}
          countLabel={t('mealsList.countLabel', { count: meals.length })}
        />
        <div className="min-h-0 min-w-0 flex-1" aria-hidden />
        <Button size="sm" className="shrink-0 cursor-pointer" onClick={openAdd}>
          {t('mealsList.addMeal')}
        </Button>
      </div>

      {meals.length === 0 && !hasSearch ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t('mealsList.noMeals')}</p>
      ) : meals.length === 0 && hasSearch ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t('mealsList.noMealsSearch')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meals.map(m => (
            <div
              key={m.id}
              className="border border-border rounded-xl p-5 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openEdit(m)}
            >
              <h3 className="font-medium text-sm text-foreground mb-3">{m.name}</h3>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="protein">{t('mealsList.protein')}</Badge>
                  <span className="text-xs text-muted-foreground">{m.protein?.name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="base">{t('mealsList.base')}</Badge>
                  <span className="text-xs text-muted-foreground">{m.base?.name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="side">{t('mealsList.side')}</Badge>
                  <span className="text-xs text-muted-foreground">{m.side?.name ?? '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ maxWidth: '520px' }} className="flex flex-col">
          <SheetHeader className="shrink-0 px-6 pt-6 pb-0">
            <SheetTitle>{editing ? t('mealsList.editMeal') : t('mealsList.addMeal')}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5">

              <div className={FW}>
                <Label>{t('mealsList.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder={t('mealsList.placeholder')}
                />
              </div>

              <div className={FW}>
                <Label>{t('mealsList.protein')}</Label>
                <Select
                  value={formData.protein_id}
                  onValueChange={v => handleChange('protein_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder={t('mealsList.selectProtein')} /></SelectTrigger>
                  <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                    {proteins.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={FW}>
                <Label>{t('mealsList.base')}</Label>
                <Select
                  value={formData.base_id}
                  onValueChange={v => handleChange('base_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder={t('mealsList.selectBase')} /></SelectTrigger>
                  <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                    {bases.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={FW}>
                <Label>{t('mealsList.side')}</Label>
                <Select
                  value={formData.sides_id}
                  onValueChange={v => handleChange('sides_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder={t('mealsList.selectSide')} /></SelectTrigger>
                  <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                    {sideRecipes.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {isSaving ? tCommon('saving') : editing ? t('mealsList.saveChanges') : t('mealsList.addMeal')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
