'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { CaretDown } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { createOrder } from '@/app/[locale]/orders/actions'
import { cn, getNextMonday } from '@/lib/utils'
import {
  BASE_PORTION_G,
  BASE_PRICE_PLN,
  ORDER_DELIVERY_FEE_PLN,
  PORTION_TIERS,
} from '@/lib/calculations'
import { CUSTOMER_TEXTAREA_100 } from './customer-field-classes'
import type { Customer, MealsPerWeek, DeliveryType, OrderStatus } from '@/lib/types'

const SHEET_SELECT_CONTENT_CLASS =
  'min-w-[var(--radix-select-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

const SHEET_COMBO_CONTENT_CLASS =
  'min-w-[var(--radix-popover-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

const FW = 'flex w-full min-w-0 flex-col gap-1.5'

type FormState = {
  week_start: string
  meals_per_week: MealsPerWeek
  portion_size_g: number
  price_per_meal_pln: number
  delivery_type: DeliveryType
  delivery_address: string
  status: OrderStatus
  notes: string
}

function allergyNotes(customer?: Customer | null): string {
  if (!customer?.allergies) return ''
  const oneLine = customer.allergies
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ')
  return `ALLERGIES: ${oneLine}\n`
}

function makeEmptyForm(customer?: Customer): FormState {
  return {
    week_start: getNextMonday(),
    meals_per_week: '5',
    portion_size_g: customer?.protein_portion_size_g ?? BASE_PORTION_G,
    price_per_meal_pln: customer?.price_per_meal_pln ?? BASE_PRICE_PLN,
    delivery_type: 'delivery',
    delivery_address: customer?.address ?? '',
    status: 'pending',
    notes: allergyNotes(customer),
  }
}

interface AddOrderSheetProps {
  customer?: Customer
  customers?: Customer[]
}

export function AddOrderSheet({ customer, customers }: AddOrderSheetProps = {}) {
  const t = useTranslations('orders')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [formData, setFormData] = useState<FormState>(makeEmptyForm(customer))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const effectiveCustomer = customer ?? selectedCustomer
  const mealsSubtotal = Number(formData.meals_per_week) * formData.price_per_meal_pln
  const deliveryFee =
    formData.delivery_type === 'delivery' ? ORDER_DELIVERY_FEE_PLN : 0
  const totalPrice = mealsSubtotal + deliveryFee

  function handleOpenChange(v: boolean) {
    if (v) {
      setSelectedCustomer(null)
      setCustomerPickerOpen(false)
      setFormData(makeEmptyForm(customer))
      setSaveError(null)
    }
    setOpen(v)
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function handlePortionChange(portionG: number) {
    const tier = PORTION_TIERS.find(t => t.portion_g === portionG)
    setFormData(prev => ({
      ...prev,
      portion_size_g: portionG,
      price_per_meal_pln: tier?.price_pln ?? prev.price_per_meal_pln,
    }))
  }

  function handleCustomerSelect(id: string) {
    const c = customers?.find(c => c.id === id) ?? null
    setSelectedCustomer(c)
    if (c) setFormData(prev => ({
      ...prev,
      delivery_address: c.address ?? '',
      portion_size_g: c.protein_portion_size_g ?? BASE_PORTION_G,
      price_per_meal_pln: c.price_per_meal_pln ?? BASE_PRICE_PLN,
      status: 'pending',
      notes: allergyNotes(c),
    }))
  }

  async function handleSave() {
    if (!effectiveCustomer) return
    setIsSaving(true)
    setSaveError(null)
    const now = new Date().toISOString()
    const { error } = await createOrder({
      customer_id: effectiveCustomer.id,
      week_start: formData.week_start,
      meals_per_week: formData.meals_per_week,
      portion_size_g: formData.portion_size_g,
      price_per_meal_pln: formData.price_per_meal_pln,
      delivery_type: formData.delivery_type,
      delivery_address:
        formData.delivery_type === 'delivery'
          ? formData.delivery_address.trim() || null
          : null,
      notes: formData.notes || null,
      price_pln: totalPrice,
      payment_status: 'pending',
      payment_received_at: null,
      order_confirmed_at: formData.status === 'confirmed' ? now : null,
      status: formData.status,
    })
    setIsSaving(false)
    if (error) { setSaveError(error); return }
    router.refresh()
    setOpen(false)
  }

  const isSaveDisabled = !formData.week_start || isSaving || !effectiveCustomer

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {customer
          ? <Button variant="default" size="sm" className="cursor-pointer">{t('addOrder')}</Button>
          : <Button className="cursor-pointer">{t('addOrder')}</Button>
        }
      </SheetTrigger>

      <SheetContent side="right" style={{ maxWidth: '520px' }}>
        <SheetHeader className="pb-4">
          <SheetTitle>{t('addOrder')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-5">

            {!customer && customers && (
              <div className={FW}>
                <Label>{t('form.customer')}</Label>
                <Popover modal={false} open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerPickerOpen}
                      className={cn(
                        'h-9 w-full min-w-0 cursor-pointer justify-between border-input bg-transparent px-2 font-normal shadow-none hover:bg-transparent',
                        !selectedCustomer && 'text-muted-foreground'
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        {selectedCustomer
                          ? selectedCustomer.whatsapp_number
                            ? `${selectedCustomer.first_name} ${selectedCustomer.last_name} (${selectedCustomer.whatsapp_number})`
                            : `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                          : t('form.selectCustomer')}
                      </span>
                      <CaretDown size={14} className="shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={4}
                    className={cn('p-0 z-[100]', SHEET_COMBO_CONTENT_CLASS)}
                  >
                    <Command>
                      <CommandInput placeholder={t('form.searchCustomer')} />
                      <CommandList>
                        <CommandEmpty>{t('form.noCustomerFound')}</CommandEmpty>
                        <CommandGroup>
                          {customers.map(c => (
                            <CommandItem
                              key={c.id}
                              value={`${c.first_name} ${c.last_name} ${c.whatsapp_number ?? ''}`}
                              onSelect={() => {
                                handleCustomerSelect(c.id)
                                setCustomerPickerOpen(false)
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {c.first_name} {c.last_name}
                                {c.whatsapp_number && (
                                  <span className="text-muted-foreground ml-1">
                                    ({c.whatsapp_number})
                                  </span>
                                )}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className={FW}>
              <Label>{t('form.weekStart')}</Label>
              <Input
                type="date"
                value={formData.week_start}
                onChange={e => handleChange('week_start', e.target.value)}
              />
            </div>

            <div className={FW}>
              <Label>{t('form.mealsPerWeek')}</Label>
              <Select
                value={formData.meals_per_week}
                onValueChange={v => handleChange('meals_per_week', v as MealsPerWeek)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                  {(['2', '5', '10', '14'] as const).map(count => (
                    <SelectItem key={count} value={count}>
                      {t('form.mealsCount', { count: Number(count) })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={FW}>
              <Label>{t('form.portionSize')}</Label>
              <Select
                value={String(formData.portion_size_g)}
                onValueChange={v => handlePortionChange(Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                  {PORTION_TIERS.map(pt => (
                    <SelectItem key={pt.portion_g} value={String(pt.portion_g)}>
                      {pt.portion_g}g
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={FW}>
              <Label>{t('form.deliveryType')}</Label>
              <Select
                value={formData.delivery_type}
                onValueChange={v => handleChange('delivery_type', v as DeliveryType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                  <SelectItem value="delivery">
                    {t('form.deliveryWithFee', { fee: ORDER_DELIVERY_FEE_PLN })}
                  </SelectItem>
                  <SelectItem value="pickup">{t('deliveryType.pickup')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.delivery_type === 'delivery' && (
              <div className={FW}>
                <Label>{t('form.deliveryAddress')}</Label>
                <textarea
                  value={formData.delivery_address}
                  onChange={e => handleChange('delivery_address', e.target.value)}
                  placeholder={t('form.address')}
                  className={CUSTOMER_TEXTAREA_100}
                />
              </div>
            )}

            <div className="rounded-xl bg-muted p-4">
              <div className="grid grid-cols-2 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('form.pricePerMeal')}</p>
                  <p className="text-sm font-semibold text-foreground">{formData.price_per_meal_pln} zł</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('form.total')}</p>
                  <p className="text-sm font-semibold text-foreground">{totalPrice} zł</p>
                </div>
              </div>
            </div>

            <div className={FW}>
              <Label>{t('form.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={v => handleChange('status', v as OrderStatus)}
              >
                <SelectTrigger className="h-auto py-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SHEET_SELECT_CONTENT_CLASS}>
                  <SelectItem value="pending"><Badge variant="pending">{t('status.pending')}</Badge></SelectItem>
                  <SelectItem value="confirmed"><Badge variant="confirmed">{t('status.confirmed')}</Badge></SelectItem>
                  <SelectItem value="cancelled"><Badge variant="cancelled">{t('status.cancelled')}</Badge></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={FW}>
              <Label>{t('form.notes')}</Label>
              <textarea
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                placeholder={t('form.optional')}
                className={CUSTOMER_TEXTAREA_100}
              />
            </div>

          </div>
        </div>

        <div className="shrink-0 px-6 py-4">
          {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
          <Button
            type="button"
            className="w-full cursor-pointer"
            disabled={isSaveDisabled}
            onClick={handleSave}
          >
            {isSaving ? tCommon('saving') : t('form.saveOrder')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
