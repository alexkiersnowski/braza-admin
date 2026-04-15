'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
import { updateOrder, deleteOrder } from './actions'
import { DeleteWithConfirm } from '@/components/delete-with-confirm'
import { ORDER_DELIVERY_FEE_PLN, PORTION_TIERS } from '@/lib/calculations'
import { CUSTOMER_TEXTAREA_100 } from '@/app/[locale]/customers/customer-field-classes'
import type { MealsPerWeek, DeliveryType, OrderStatus } from '@/lib/types'
import type { OrderWithCustomer } from './orders-client'

const SHEET_SELECT_CONTENT_CLASS =
  'min-w-[var(--radix-select-trigger-width)] w-[min(29.5rem,calc(100vw-2rem))]'

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

function orderToForm(order: OrderWithCustomer): FormState {
  return {
    week_start: order.week_start,
    meals_per_week: order.meals_per_week,
    portion_size_g: order.portion_size_g,
    price_per_meal_pln: order.price_per_meal_pln,
    delivery_type: order.delivery_type,
    delivery_address: order.delivery_address ?? '',
    status: order.status,
    notes: order.notes ?? '',
  }
}

interface EditOrderSheetProps {
  order: OrderWithCustomer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function EditOrderSheet({ order, open, onOpenChange, onSaved }: EditOrderSheetProps) {
  const t = useTranslations('orders')
  const tCommon = useTranslations('common')
  const [formData, setFormData] = useState<FormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (order) {
      setFormData(orderToForm(order))
      setSaveError(null)
    }
  }, [order])

  if (!formData || !order) return null

  const mealsSubtotal = Number(formData.meals_per_week) * formData.price_per_meal_pln
  const deliveryFee =
    formData.delivery_type === 'delivery' ? ORDER_DELIVERY_FEE_PLN : 0
  const totalPrice = mealsSubtotal + deliveryFee

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function handlePortionChange(portionG: number) {
    const tier = PORTION_TIERS.find(t => t.portion_g === portionG)
    setFormData(prev => prev ? {
      ...prev,
      portion_size_g: portionG,
      price_per_meal_pln: tier?.price_pln ?? prev.price_per_meal_pln,
    } : prev)
  }

  async function handleSave() {
    if (!formData) return
    setIsSaving(true)
    setSaveError(null)
    const now = new Date().toISOString()
    const orderConfirmedAt =
      formData.status === 'confirmed'
        ? (order!.status === 'confirmed' ? order!.order_confirmed_at : now)
        : null
    const { error } = await updateOrder(order!.id, {
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
      payment_status: order!.payment_status,
      payment_received_at: order!.payment_received_at,
      status: formData.status,
      order_confirmed_at: orderConfirmedAt,
    })
    setIsSaving(false)
    if (error) { setSaveError(error); return }
    onSaved()
    onOpenChange(false)
  }

  const customerName = order.customers
    ? `${order.customers.first_name} ${order.customers.last_name}`
    : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" style={{ maxWidth: '520px' }} className="flex flex-col">
        <SheetHeader className="flex flex-row items-center gap-2 pb-4 pr-14 pt-4">
          <SheetTitle className="text-balance flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
            <span>Order #{order.order_number}</span>
            {customerName ? (
              <span className="text-sm font-normal text-muted-foreground">
                — {customerName}
              </span>
            ) : null}
          </SheetTitle>
          <div className="shrink-0">
            <DeleteWithConfirm
              itemLabel={`Order #${order.order_number}`}
              labels={{
                deleteItem: t('deleteOrder'),
                confirmTitle: t('deleteOrderTitle'),
                confirmDescription: t('deleteOrderDescription'),
                confirmButton: tCommon('delete'),
                cancelButton: tCommon('cancel'),
                deleting: tCommon('deleting'),
              }}
              onConfirm={async () => {
                const { error } = await deleteOrder(order!.id)
                if (error) { setSaveError(error); throw new Error(error) }
                onSaved()
                onOpenChange(false)
              }}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-5">

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

        <div className="shrink-0 px-6 py-4 border-t border-border">
          {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
          <Button
            type="button"
            className="w-full cursor-pointer"
            disabled={!formData.week_start || isSaving}
            onClick={handleSave}
          >
            {isSaving ? tCommon('saving') : t('saveChanges')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
