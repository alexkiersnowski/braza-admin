'use server'

import { createServerClient } from '@/lib/supabase/server'
import { generateProductionRows, deleteProductionRows } from '@/lib/production'
import type { Order, OrderStatus } from '@/lib/types'

export async function createOrder(
  data: Omit<Order, 'id' | 'created_at' | 'order_number'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServerClient()
  const { data: row, error } = await supabase
    .from('orders')
    .insert(data)
    .select('id')
    .single()
  if (error) return { id: null, error: error.message }
  return { id: row.id, error: null }
}


export async function updateOrder(
  id: string,
  data: Pick<Order, 'week_start' | 'meals_per_week' | 'portion_size_g' | 'price_per_meal_pln' | 'delivery_type' | 'delivery_address' | 'notes' | 'price_pln' | 'payment_status' | 'payment_received_at' | 'status' | 'order_confirmed_at'>
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const { error } = await supabase.from('orders').update(data).eq('id', id)
  if (error) return { error: error.message }

  if (data.status === 'confirmed') {
    // Regenerate production rows to reflect any changes (portion, meals_per_week, week, etc.)
    await generateProductionRows(id, supabase)
  } else if (data.status === 'cancelled' || data.status === 'pending') {
    // Remove production rows — order is no longer active
    await deleteProductionRows(id, supabase)
  }

  return { error: null }
}

export async function confirmOrder(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      payment_received_at: now,
      order_confirmed_at: now,
    })
    .eq('id', id)
  if (error) return { error: error.message }

  const { error: prodError } = await generateProductionRows(id, supabase)
  if (prodError) return { error: prodError }
  return { error: null }
}

export async function cancelOrder(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', order_confirmed_at: null })
    .eq('id', id)
  if (error) return { error: error.message }
  await deleteProductionRows(id, supabase)
  return { error: null }
}
