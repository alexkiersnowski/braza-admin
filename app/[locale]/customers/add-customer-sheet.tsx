'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Sparkle } from '@phosphor-icons/react'
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
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  BASE_PORTION_G,
  calculateCustomerMetrics,
  PORTION_TIERS,
} from '@/lib/calculations'
import { CUSTOMER_TEXTAREA_100 } from './customer-field-classes'
import { prefillFromConversation, createCustomer, updateCustomer, saveCustomerMealExclusions } from './actions'
import type { ActivityLevel, CustomerGoal, CustomerSex, CustomerType, Customer, Meal } from '@/lib/types'

type FormState = {
  first_name: string
  last_name: string
  whatsapp_number: string
  type: CustomerType
  address: string
  allergies: string
  sex: CustomerSex | ''
  age: string
  weight: string
  target_weight: string
  height: string
  activity_level: ActivityLevel | ''
  goal: CustomerGoal | ''
  protein_multiplier: number | null
  daily_calories: number | null
  daily_protein_g: number | null
  braza_protein_g: number | null
  protein_portion_size_g: number | null
  protein_uplift: boolean | null
  price_per_meal_pln: number | null
}

const EMPTY_FORM: FormState = {
  first_name: '',
  last_name: '',
  whatsapp_number: '',
  type: 'standard',
  address: '',
  allergies: '',
  sex: '',
  age: '',
  weight: '',
  target_weight: '',
  height: '',
  activity_level: '',
  goal: '',
  protein_multiplier: null,
  daily_calories: null,
  daily_protein_g: null,
  braza_protein_g: null,
  protein_portion_size_g: null,
  protein_uplift: null,
  price_per_meal_pln: null,
}

// Exact tier match, else snap up to next tier (for legacy portion values).
function tierForPortion(portionG: number | null) {
  if (portionG == null) return null
  const exact = PORTION_TIERS.find(tier => tier.portion_g === portionG)
  if (exact) return exact
  return (
    PORTION_TIERS.find(tier => tier.portion_g >= portionG) ?? PORTION_TIERS[PORTION_TIERS.length - 1]
  )
}

function customerToForm(c: Customer): FormState {
  const portionTier =
    c.protein_portion_size_g != null ? tierForPortion(c.protein_portion_size_g) : null

  return {
    first_name: c.first_name,
    last_name: c.last_name,
    whatsapp_number: c.whatsapp_number,
    type: c.type,
    address: c.address ?? '',
    allergies: c.allergies ?? '',
    sex: c.sex ?? '',
    age: c.age != null ? String(c.age) : '',
    weight: c.weight != null ? String(c.weight) : '',
    target_weight: c.target_weight != null ? String(c.target_weight) : '',
    height: c.height != null ? String(c.height) : '',
    activity_level: c.activity_level ?? '',
    goal: c.goal ?? '',
    protein_multiplier: c.protein_multiplier,
    daily_calories: c.daily_calories,
    daily_protein_g: c.daily_protein_g,
    braza_protein_g: c.braza_protein_g,
    protein_portion_size_g:
      portionTier != null ? portionTier.portion_g : c.protein_portion_size_g,
    protein_uplift:
      portionTier != null
        ? portionTier.portion_g > BASE_PORTION_G
        : c.protein_uplift,
    price_per_meal_pln:
      portionTier != null ? portionTier.price_pln : c.price_per_meal_pln,
  }
}

const CALC_KEYS = ['weight', 'target_weight', 'height', 'age', 'sex', 'activity_level', 'goal']

/** Section titles: 16px, matches SheetTitle weight/color hierarchy. */
const SECTION_HEADING =
  'text-base font-semibold text-foreground tracking-tight mb-4'

/** Eyebrow label (e.g. AI Assistance). */
const SECTION_EYEBROW =
  'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5'
const FW = 'flex w-full min-w-0 flex-col gap-1.5'

/** Sheet inner max: 520px minus horizontal padding (2× px-6). Menus at least trigger width, up to that. */
const SHEET_SELECT_CONTENT_CLASS =
  'min-w-[var(--radix-select-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

function formCanCalculate(f: FormState): boolean {
  return !!(
    f.weight && Number(f.weight) > 0 &&
    f.target_weight && Number(f.target_weight) > 0 &&
    f.height && Number(f.height) > 0 &&
    f.age && Number(f.age) > 0 &&
    f.sex && f.activity_level && f.goal
  )
}

function buildPayload(f: FormState): Omit<Customer, 'id' | 'created_at' | 'excluded_meals'> {
  const perf = f.type === 'performance'
  return {
    first_name: f.first_name,
    last_name: f.last_name,
    whatsapp_number: f.whatsapp_number,
    type: f.type,
    address: f.address.trim() || null,
    allergies: f.allergies || null,
    sex: perf && f.sex ? f.sex : null,
    age: perf && f.age ? Number(f.age) : null,
    weight: perf && f.weight ? Number(f.weight) : null,
    target_weight: perf && f.target_weight ? Number(f.target_weight) : null,
    height: perf && f.height ? Number(f.height) : null,
    activity_level: perf && f.activity_level ? f.activity_level : null,
    goal: perf && f.goal ? f.goal : null,
    protein_multiplier: perf ? f.protein_multiplier : null,
    daily_calories: perf ? f.daily_calories : null,
    daily_protein_g: perf ? f.daily_protein_g : null,
    braza_protein_g: perf ? f.braza_protein_g : null,
    protein_portion_size_g: perf ? f.protein_portion_size_g : null,
    protein_uplift: perf ? f.protein_uplift : null,
    price_per_meal_pln: perf ? f.price_per_meal_pln : null,
  }
}

interface CustomerSheetProps {
  customer?: Customer
  onSaved?: (updated: Customer) => void
  meals?: Pick<Meal, 'id' | 'name'>[]
}

export function AddCustomerSheet({ customer, onSaved, meals = [] }: CustomerSheetProps = {}) {
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const isEdit = !!customer

  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)

  // Shared helper: apply prefill data and open the sheet (create mode only)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function applyPerfPrefill(prefill: Record<string, unknown>) {
    setFormData(prev => ({
      ...prev,
      type: 'performance',
      ...(prefill.first_name ? { first_name: String(prefill.first_name) } : {}),
      ...(prefill.last_name ? { last_name: String(prefill.last_name) } : {}),
      ...(prefill.whatsapp_number ? { whatsapp_number: String(prefill.whatsapp_number) } : {}),
      ...(prefill.address ? { address: String(prefill.address) } : {}),
      ...(prefill.allergies ? { allergies: String(prefill.allergies) } : {}),
      ...(prefill.sex ? { sex: prefill.sex as FormState['sex'] } : {}),
      ...(prefill.age ? { age: String(prefill.age) } : {}),
      ...(prefill.weight ? { weight: String(prefill.weight) } : {}),
      ...(prefill.target_weight ? { target_weight: String(prefill.target_weight) } : {}),
      ...(prefill.height ? { height: String(prefill.height) } : {}),
      ...(prefill.activity_level ? { activity_level: prefill.activity_level as FormState['activity_level'] } : {}),
      ...(prefill.goal ? { goal: prefill.goal as FormState['goal'] } : {}),
    }))
    setHasCalculated(false)
    setOpen(true)
  }

  // Command bar — cross-page: on mount, check sessionStorage (fires when navigating TO this page)
  useEffect(() => {
    if (isEdit) return
    const cmd = sessionStorage.getItem('braza_cmd_open_sheet')
    if (cmd !== 'add_performance_customer') return
    const raw = sessionStorage.getItem('braza_cmd_prefill') ?? '{}'
    sessionStorage.removeItem('braza_cmd_open_sheet')
    sessionStorage.removeItem('braza_cmd_prefill')
    try {
      applyPerfPrefill(JSON.parse(raw))
      // Sheet is opening — close the command bar
      window.dispatchEvent(new CustomEvent('braza:cmd-close'))
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Command bar — same-page: listen for custom event (fires when already on /customers)
  useEffect(() => {
    if (isEdit) return
    function handleEvent(e: Event) {
      try {
        const prefill = (e as CustomEvent<{ prefill: Record<string, unknown> }>).detail?.prefill ?? {}
        applyPerfPrefill(prefill)
      } catch { /* ignore */ }
    }
    window.addEventListener('braza:open-perf-sheet', handleEvent)
    return () => window.removeEventListener('braza:open-perf-sheet', handleEvent)
  }, [isEdit]) // eslint-disable-line react-hooks/exhaustive-deps
  const [excludedMealIds, setExcludedMealIds] = useState<Set<string>>(new Set())
  const [hasCalculated, setHasCalculated] = useState(false)
  const [conversation, setConversation] = useState('')
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleOpenChange(v: boolean) {
    if (v) {
      // Reset to customer data (edit) or blank (create) each time it opens
      const initial = customer ? customerToForm(customer) : EMPTY_FORM
      setFormData(initial)
      setExcludedMealIds(new Set(customer?.excluded_meals?.map(m => m.id) ?? []))
      setHasCalculated(isEdit ? customer!.daily_calories != null : false)
      setConversation('')
      setPrefillError(null)
      setSaveError(null)
    }
    setOpen(v)
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (CALC_KEYS.includes(key as string)) setHasCalculated(false)
  }

  function toggleMealExclusion(mealId: string, excluded: boolean) {
    setExcludedMealIds(prev => {
      const next = new Set(prev)
      excluded ? next.add(mealId) : next.delete(mealId)
      return next
    })
  }

  async function handlePrefill() {
    setIsPrefilling(true)
    setPrefillError(null)
    const { data: d, error } = await prefillFromConversation(conversation)
    setIsPrefilling(false)
    if (error || !d) { setPrefillError(error ?? 'Failed to extract data.'); return }
    setFormData(prev => ({
      ...prev,
      ...(d.first_name != null && { first_name: d.first_name }),
      ...(d.last_name != null && { last_name: d.last_name }),
      ...(d.whatsapp_number != null && { whatsapp_number: d.whatsapp_number }),
      ...(d.type != null && { type: d.type }),
      ...(d.address != null && { address: d.address }),
      ...(d.allergies != null && { allergies: d.allergies }),
      ...(d.sex != null && { sex: d.sex }),
      ...(d.age != null && { age: String(d.age) }),
      ...(d.weight != null && { weight: String(d.weight) }),
      ...(d.target_weight != null && { target_weight: String(d.target_weight) }),
      ...(d.height != null && { height: String(d.height) }),
      ...(d.activity_level != null && { activity_level: d.activity_level }),
      ...(d.goal != null && { goal: d.goal }),
    }))
  }

  function handleCalculate() {
    if (!formCanCalculate(formData) || !formData.sex || !formData.activity_level || !formData.goal) return
    const results = calculateCustomerMetrics({
      weight: Number(formData.weight),
      target_weight: Number(formData.target_weight),
      height: Number(formData.height),
      age: Number(formData.age),
      sex: formData.sex,
      activity_level: formData.activity_level,
      goal: formData.goal,
    })
    setFormData(prev => ({ ...prev, ...results }))
    setHasCalculated(true)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    const payload = buildPayload(formData)
    const mealIds = [...excludedMealIds]

    if (isEdit) {
      const { error } = await updateCustomer(customer!.id, payload)
      if (error) { setSaveError(error); setIsSaving(false); return }
      await saveCustomerMealExclusions(customer!.id, mealIds)
      setIsSaving(false)
      const updatedExcludedMeals = meals
        .filter(m => excludedMealIds.has(m.id))
        .map(m => ({ id: m.id, name: m.name }))
      onSaved?.({ ...customer!, ...payload, excluded_meals: updatedExcludedMeals })
      setOpen(false)
    } else {
      const { id, error } = await createCustomer(payload)
      if (error || !id) { setSaveError(error ?? 'Failed to save.'); setIsSaving(false); return }
      await saveCustomerMealExclusions(id, mealIds)
      setIsSaving(false)
      router.refresh()
      setOpen(false)
    }
  }

  const basicFilled = !!(formData.first_name && formData.last_name && formData.whatsapp_number)
  const isSaveDisabled = !basicFilled || (formData.type === 'performance' && !hasCalculated) || isSaving

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {isEdit
          ? <Button variant="outline" size="sm" className="cursor-pointer">{tCommon('edit')}</Button>
          : <Button className="cursor-pointer">{t('addCustomer')}</Button>
        }
      </SheetTrigger>

      <SheetContent side="right" style={{ maxWidth: '520px' }}>
        <SheetHeader className="pb-4">
          <SheetTitle>{isEdit ? t('editCustomer') : t('addCustomer')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-12 [&_label]:!text-xs [&_label]:!text-primary">

          {!isEdit && (
            <section>
              <div className={SECTION_EYEBROW}>
                <Sparkle size={14} className="shrink-0 text-muted-foreground" weight="fill" aria-hidden />
                {t('form.aiAssistance')}
              </div>
              <div className="flex flex-col gap-3">
                <textarea
                  value={conversation}
                  onChange={e => setConversation(e.target.value)}
                  placeholder={t('form.aiPlaceholder')}
                  className="h-[132px] w-full resize-none overflow-y-auto border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {prefillError && <p className="text-sm text-red-600">{prefillError}</p>}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-2"
                    onClick={handlePrefill}
                    disabled={!conversation.trim() || isPrefilling}
                  >
                    <Sparkle size={14} className="shrink-0 text-muted-foreground" weight="fill" aria-hidden />
                    {isPrefilling ? t('form.preFilling') : t('form.preFillFields')}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Basic Info */}
          <section>
            <h3 className={SECTION_HEADING}>{t('form.basicInfo')}</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className={FW}>
                  <Label>{t('form.firstName')}</Label>
                  <Input value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} />
                </div>
                <div className={FW}>
                  <Label>{t('form.lastName')}</Label>
                  <Input value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} />
                </div>
              </div>
              <div className={FW}>
                <Label>{t('form.type')}</Label>
                <Select value={formData.type} onValueChange={v => handleChange('type', v as CustomerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                    <SelectItem value="standard">{t('type.standard')}</SelectItem>
                    <SelectItem value="performance">{t('type.performance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={FW}>
                <Label>{t('form.whatsappNumber')}</Label>
                <Input value={formData.whatsapp_number} onChange={e => handleChange('whatsapp_number', e.target.value)} />
              </div>
              <div className={FW}>
                <Label>{t('form.address')}</Label>
                <textarea
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                  className={CUSTOMER_TEXTAREA_100}
                />
              </div>
            </div>

            {/* Meal exclusions */}
            <div className="mt-5">
              <Label className="mb-2 block">{t('form.mealExclusions')}</Label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {meals.length > 0 ? meals.map(meal => (
                  <label
                    key={meal.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={excludedMealIds.has(meal.id)}
                      onChange={e => toggleMealExclusion(meal.id, e.target.checked)}
                      className="accent-primary shrink-0"
                    />
                    <span className="text-xs">{meal.name}</span>
                  </label>
                )) : (
                  <p className="text-xs text-muted-foreground px-3 py-2">{t('form.noMealsConfigured')}</p>
                )}
              </div>
            </div>

            <div className={`${FW} mt-4`}>
              <Label>{t('form.allergies')}</Label>
              <textarea
                value={formData.allergies}
                onChange={e => handleChange('allergies', e.target.value)}
                className={CUSTOMER_TEXTAREA_100}
              />
            </div>
          </section>

          {/* Performance Stats */}
          {formData.type === 'performance' && (
            <section>
              <h3 className={SECTION_HEADING}>{t('form.performanceStats')}</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className={FW}>
                  <Label>{t('form.sex')}</Label>
                  <Select value={formData.sex} onValueChange={v => handleChange('sex', v as CustomerSex)}>
                    <SelectTrigger><SelectValue placeholder={t('form.select')} /></SelectTrigger>
                    <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                      <SelectItem value="male">{t('sex.male')}</SelectItem>
                      <SelectItem value="female">{t('sex.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={FW}>
                  <Label>{t('form.age')}</Label>
                  <Input type="number" value={formData.age} onChange={e => handleChange('age', e.target.value)} />
                </div>
                <div className={FW}>
                  <Label>{t('form.weight')}</Label>
                  <Input type="number" step="0.1" value={formData.weight} onChange={e => handleChange('weight', e.target.value)} />
                </div>
                <div className={FW}>
                  <Label>{t('form.targetWeight')}</Label>
                  <Input type="number" step="0.1" value={formData.target_weight} onChange={e => handleChange('target_weight', e.target.value)} />
                </div>
                <div className={`${FW} col-span-2`}>
                  <Label>{t('form.height')}</Label>
                  <Input type="number" value={formData.height} onChange={e => handleChange('height', e.target.value)} />
                </div>
                <div className={`${FW} col-span-2`}>
                  <Label>{t('form.activityLevel')}</Label>
                  <Select value={formData.activity_level} onValueChange={v => handleChange('activity_level', v as ActivityLevel)}>
                    <SelectTrigger><SelectValue placeholder={t('form.select')} /></SelectTrigger>
                    <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                      <SelectItem value="sedentary"><span className="truncate">{t('activityLevel.sedentary')}</span></SelectItem>
                      <SelectItem value="light"><span className="truncate">{t('activityLevel.light')}</span></SelectItem>
                      <SelectItem value="moderate"><span className="truncate">{t('activityLevel.moderate')}</span></SelectItem>
                      <SelectItem value="high"><span className="truncate">{t('activityLevel.high')}</span></SelectItem>
                      <SelectItem value="very_high"><span className="truncate">{t('activityLevel.veryHigh')}</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={`${FW} col-span-2`}>
                  <Label>{t('form.goal')}</Label>
                  <Select value={formData.goal} onValueChange={v => handleChange('goal', v as CustomerGoal)}>
                    <SelectTrigger><SelectValue placeholder={t('form.select')} /></SelectTrigger>
                    <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                      <SelectItem value="lose_weight">{t('goal.loseWeight')}</SelectItem>
                      <SelectItem value="maintain">{t('goal.maintain')}</SelectItem>
                      <SelectItem value="gain_muscle">{t('goal.gainMuscle')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-5">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleCalculate}
                  disabled={!formCanCalculate(formData)}
                >
                  {t('form.calculateNutrition')}
                </Button>
              </div>
            </section>
          )}

          {/* Calculated Results */}
          {formData.type === 'performance' && hasCalculated && (
            <section>
              <div className="rounded-xl bg-muted p-5 sm:p-6">
                <h3 className={SECTION_HEADING}>{t('form.calculatedResults')}</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className={FW}>
                  <Label>{t('form.dailyCalories')}</Label>
                  <Input type="number" value={formData.daily_calories ?? ''} onChange={e => handleChange('daily_calories', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div className={FW}>
                  <Label>{t('form.dailyProtein')}</Label>
                  <Input type="number" step="0.1" value={formData.daily_protein_g ?? ''} onChange={e => handleChange('daily_protein_g', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div className={FW}>
                  <Label>{t('form.proteinPerMeal')}</Label>
                  <Input type="number" step="0.1" value={formData.braza_protein_g ?? ''} onChange={e => handleChange('braza_protein_g', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div className={FW}>
                  <Label>{t('form.portionSize')}</Label>
                  <div className="w-full min-w-0">
                    <Select
                      value={
                        tierForPortion(formData.protein_portion_size_g)?.portion_g.toString() ?? ''
                      }
                      onValueChange={v => {
                        const tier = PORTION_TIERS.find(pt => pt.portion_g === Number(v))
                        if (!tier) return
                        setFormData(prev => ({
                          ...prev,
                          protein_portion_size_g: tier.portion_g,
                          price_per_meal_pln: tier.price_pln,
                          protein_uplift: tier.portion_g > BASE_PORTION_G,
                        }))
                      }}
                    >
                      <SelectTrigger className="w-full max-w-full">
                        <SelectValue placeholder={t('form.selectPortion')} />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                        {PORTION_TIERS.map(pt => (
                          <SelectItem key={pt.portion_g} value={String(pt.portion_g)}>
                            {pt.portion_g} g
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className={FW}>
                  <Label>{t('form.proteinMultiplier')}</Label>
                  <p className="text-lg font-semibold text-foreground pt-1">
                    {formData.protein_multiplier != null
                      ? formData.protein_multiplier.toFixed(1)
                      : '—'}
                  </p>
                </div>
                <div className={FW}>
                  <Label>{t('form.pricePerMeal')}</Label>
                  <p className="text-lg font-semibold text-foreground pt-1">
                    {formData.price_per_meal_pln != null ? String(formData.price_per_meal_pln) : '—'}
                  </p>
                </div>
                </div>
              </div>
            </section>
          )}

        </div>

        <div className="shrink-0 px-6 py-4">
          {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
          <Button type="button" className="w-full cursor-pointer" disabled={isSaveDisabled} onClick={handleSave}>
            {isSaving ? tCommon('saving') : isEdit ? t('saveChanges') : t('saveCustomer')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
