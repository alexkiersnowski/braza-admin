'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { CaretDown, CaretUp, Plus, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { saveSideRecipe } from './actions'
import { MealsTabNameSearch } from './meals-tab-name-search'
import type { Ingredient, SideRecipe } from '@/lib/types'

const FW = 'flex w-full min-w-0 flex-col gap-1.5'
const SHEET_COMBO_CONTENT_CLASS =
  'min-w-[var(--radix-popover-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

type IngredientLine = {
  ingredient_id: string
  portion_size_g: string
}

type FormState = {
  name: string
  total_kcal_per_portion: string
  lines: IngredientLine[]
}

const EMPTY_FORM: FormState = {
  name: '',
  total_kcal_per_portion: '',
  lines: [],
}

function recipeToForm(r: SideRecipe): FormState {
  return {
    name: r.name,
    total_kcal_per_portion: r.total_kcal_per_portion != null ? String(r.total_kcal_per_portion) : '',
    lines: (r.side_recipe_ingredients ?? []).map(sri => ({
      ingredient_id: sri.ingredient_id,
      portion_size_g: String(sri.portion_size_g),
    })),
  }
}

interface IngredientComboboxProps {
  value: string
  onChange: (id: string) => void
  options: Ingredient[]
}

function IngredientCombobox({ value, onChange, options }: IngredientComboboxProps) {
  const t = useTranslations('meals')
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            'h-9 w-full min-w-0 cursor-pointer justify-between border-input bg-transparent px-2 font-normal shadow-none hover:bg-transparent',
            !selected && 'text-muted-foreground'
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left text-xs">
            {selected ? selected.name : t('sideRecipesList.selectIngredient')}
          </span>
          <CaretDown size={14} className="shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className={cn('p-0 z-[100]', SHEET_COMBO_CONTENT_CLASS)}>
        <Command>
          <CommandInput placeholder={t('sideRecipesList.searchIngredients')} />
          <CommandList>
            <CommandEmpty>{t('sideRecipesList.noIngredientFound')}</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => {
                    onChange(o.id)
                    setOpen(false)
                  }}
                >
                  {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface Props {
  sideRecipes: SideRecipe[]
  sideIngredients: Ingredient[]
  searchQuery: string
}

const INGREDIENTS_PREVIEW = 3

function SideRecipeCard({
  recipe: r,
  ingredientById,
  onEdit,
}: {
  recipe: SideRecipe
  ingredientById: Record<string, Ingredient>
  onEdit: (r: SideRecipe) => void
}) {
  const t = useTranslations('meals')
  const [expanded, setExpanded] = useState(false)
  const ingredients = r.side_recipe_ingredients ?? []
  const hiddenCount = ingredients.length - INGREDIENTS_PREVIEW
  const showExpand = hiddenCount > 0 && !expanded
  const visible = showExpand ? ingredients.slice(0, INGREDIENTS_PREVIEW) : ingredients

  return (
    <div
      className="border border-border rounded-xl p-5 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onEdit(r)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-sm text-foreground min-w-0 flex-1">{r.name}</h3>
        {r.total_kcal_per_portion != null && (
          <span className="text-xs font-medium text-foreground shrink-0 whitespace-nowrap tabular-nums">
            {r.total_kcal_per_portion} kcal / portion
          </span>
        )}
      </div>
      {ingredients.length > 0 && (
        <ul className="space-y-1 mb-3">
          {visible.map(sri => {
            const ing = sri.ingredients ?? ingredientById[sri.ingredient_id]
            return (
              <li key={sri.id} className="text-xs text-muted-foreground">
                {ing?.name ?? '—'} — {sri.portion_size_g}g
              </li>
            )
          })}
        </ul>
      )}
      {showExpand && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
          onClick={e => {
            e.stopPropagation()
            setExpanded(true)
          }}
        >
          {t('sideRecipesList.seeAll')}
          <CaretDown size={14} weight="bold" className="shrink-0" aria-hidden />
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={e => {
            e.stopPropagation()
            setExpanded(false)
          }}
        >
          {t('sideRecipesList.seeLess')}
          <CaretUp size={14} weight="bold" className="shrink-0" aria-hidden />
        </button>
      )}
    </div>
  )
}

export function SideRecipesTab({ sideRecipes, sideIngredients, searchQuery }: Props) {
  const t = useTranslations('meals')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SideRecipe | null>(null)
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setFormData(EMPTY_FORM)
    setSaveError(null)
    setOpen(true)
  }

  function openEdit(r: SideRecipe) {
    setEditing(r)
    setFormData(recipeToForm(r))
    setSaveError(null)
    setOpen(true)
  }

  function addLine() {
    setFormData(prev => ({ ...prev, lines: [...prev.lines, { ingredient_id: '', portion_size_g: '' }] }))
  }

  function updateLine(idx: number, key: keyof IngredientLine, value: string) {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => i === idx ? { ...l, [key]: value } : l),
    }))
  }

  function removeLine(idx: number) {
    setFormData(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    const lines = formData.lines
      .filter(l => l.ingredient_id && l.portion_size_g)
      .map(l => ({ ingredient_id: l.ingredient_id, portion_size_g: Number(l.portion_size_g) }))
    const { error } = await saveSideRecipe(
      editing?.id ?? null,
      {
        name: formData.name.trim(),
        total_kcal_per_portion: formData.total_kcal_per_portion === '' ? null : Number(formData.total_kcal_per_portion),
      },
      lines
    )
    setIsSaving(false)
    if (error) { setSaveError(error); return }
    setOpen(false)
    router.refresh()
  }

  const isSaveDisabled = !formData.name.trim() || isSaving

  // Build a lookup for displaying ingredient names on cards
  const ingredientById = Object.fromEntries(sideIngredients.map(i => [i.id, i]))

  const hasSearch = searchQuery.trim().length > 0

  return (
    <div>
      <div className="mb-4 flex w-full min-w-0 items-center">
        <MealsTabNameSearch
          paramKey="side_recipes_q"
          defaultQuery={searchQuery}
          placeholder={t('sideRecipesList.searchPlaceholder')}
          countLabel={t('sideRecipesList.countLabel', { count: sideRecipes.length })}
        />
        <div className="min-h-0 min-w-0 flex-1" aria-hidden />
        <Button size="sm" className="shrink-0 cursor-pointer" onClick={openAdd}>
          {t('sideRecipesList.addSideRecipe')}
        </Button>
      </div>

      {sideRecipes.length === 0 && !hasSearch ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t('sideRecipesList.noSideRecipes')}</p>
      ) : sideRecipes.length === 0 && hasSearch ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{t('sideRecipesList.noSideRecipesSearch')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sideRecipes.map(r => (
            <SideRecipeCard
              key={r.id}
              recipe={r}
              ingredientById={ingredientById}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" style={{ maxWidth: '520px' }} className="flex flex-col">
          <SheetHeader className="shrink-0 px-6 pt-6 pb-0">
            <SheetTitle>{editing ? t('sideRecipesList.editSideRecipe') : t('sideRecipesList.addSideRecipe')}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5">

              <div className={FW}>
                <Label>{t('sideRecipesList.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('sideRecipesList.placeholder')}
                />
              </div>

              <div className={FW}>
                <Label>{t('sideRecipesList.totalKcal')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.total_kcal_per_portion}
                  onChange={e => setFormData(prev => ({ ...prev, total_kcal_per_portion: e.target.value }))}
                  placeholder={t('sideRecipesList.optional')}
                />
              </div>

              <div className={FW}>
                <Label>{t('sideRecipesList.ingredientsLabel')}</Label>
                <div className="flex flex-col gap-2">
                  {formData.lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <IngredientCombobox
                          value={line.ingredient_id}
                          onChange={id => updateLine(idx, 'ingredient_id', id)}
                          options={sideIngredients}
                        />
                      </div>
                      <div className="relative w-[4.75rem] shrink-0">
                        <Input
                          type="number"
                          min={0}
                          value={line.portion_size_g}
                          onChange={e => updateLine(idx, 'portion_size_g', e.target.value)}
                          className="h-9 w-full pr-6 tabular-nums shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                          aria-hidden
                        >
                          g
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer self-start shadow-none"
                    onClick={addLine}
                  >
                    <Plus size={14} className="mr-1" /> {t('sideRecipesList.addIngredient')}
                  </Button>
                </div>
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
              {isSaving ? tCommon('saving') : editing ? t('sideRecipesList.saveChanges') : t('sideRecipesList.addSideRecipe')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
