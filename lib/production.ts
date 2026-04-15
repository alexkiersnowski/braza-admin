import type { SupabaseClient } from '@supabase/supabase-js'
import type { Customer, Meal, MealTemplate, Order } from '@/lib/types'
import { getThisWeekMonday } from './utils'

/** Cooked base grams for standard customers (no personal calorie target). */
export const STANDARD_BASE_PORTION_G = 200

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Given an ordered list of template meals and a customer's exclusions,
 * returns the assigned meal list for the order (cycling through allowed meals
 * to fill all slots).
 */
function assignMealsFromTemplates(
  templates: MealTemplate[],
  allMeals: Meal[],
  excludedMealIds: Set<string>,
  totalSlots: number
): Meal[] {
  const mealById = new Map(allMeals.map(m => [m.id, m]))

  // Ordered template meals (skip empty slots)
  const templateMeals = templates
    .sort((a, b) => a.position - b.position)
    .flatMap(t => (t.meal_id ? [mealById.get(t.meal_id)] : []))
    .filter((m): m is Meal => m != null)

  if (templateMeals.length === 0) return []

  const allowedMeals = templateMeals.filter(m => !excludedMealIds.has(m.id))
  // Fallback: if all template meals are excluded, use all template meals anyway
  const mealsToUse = allowedMeals.length > 0 ? allowedMeals : templateMeals

  // Cycle through the allowed meals to fill all slots
  return Array.from({ length: totalSlots }, (_, i) => mealsToUse[i % mealsToUse.length])
}

export function calcProductionBasePortionG(
  meal: Meal,
  portionSizeG: number,
  dailyCalories: number | null
): { g: number; flag: boolean } {
  const baseKcalPer100g = meal.base?.cooked_kcal_per_100g ?? null
  if (baseKcalPer100g == null || baseKcalPer100g === 0) {
    return { g: 0, flag: true }
  }

  if (dailyCalories == null) {
    return { g: STANDARD_BASE_PORTION_G, flag: false }
  }

  const mealKcal = dailyCalories * 0.35
  const proteinKcal =
    meal.protein?.cooked_kcal_per_100g != null
      ? (portionSizeG / 100) * meal.protein.cooked_kcal_per_100g
      : 0
  const sideKcal = meal.side?.total_kcal_per_portion ?? 0

  const rawG = ((mealKcal - proteinKcal - sideKcal) / baseKcalPer100g) * 100
  const rounded = Math.round(rawG / 10) * 10
  const clamped = Math.max(0, rounded)
  return { g: clamped, flag: clamped < 50 }
}

function calcBasePortionG(meal: Meal, order: Order, customer: Customer): { g: number; flag: boolean } {
  return calcProductionBasePortionG(meal, order.portion_size_g, customer.daily_calories ?? null)
}

// ── Main entry point ───────────────────────────────────────────────────────────

export async function generateProductionRows(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<{ error: string | null }> {
  // 1. Fetch the order with customer
  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('*, customers(*)')
    .eq('id', orderId)
    .single()
  if (orderError) return { error: orderError.message }

  const order = orderRow as Order
  const customer = orderRow.customers as Customer
  if (!customer) return { error: 'Order has no associated customer' }

  // 2. Fetch meal templates for this meals_per_week (ordered meal slots)
  const { data: templates, error: tmplError } = await supabase
    .from('meal_templates')
    .select('*')
    .eq('meals_per_week', order.meals_per_week)
    .order('position')
  if (tmplError) return { error: tmplError.message }

  if (!templates || templates.length === 0 || templates.every((t: MealTemplate) => !t.meal_id)) {
    return { error: `No meals configured for ${order.meals_per_week} meals/week — set them in Meals → Templates` }
  }

  // 3. Fetch all non-deleted meals with full joins
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('*, protein:ingredients!protein_id(*), base:ingredients!base_id(*), side:side_recipes!sides_id(*)')
    .is('deleted_at', null)
    .order('name')
  if (mealsError) return { error: mealsError.message }

  if (!meals || meals.length === 0) {
    return { error: 'No meals configured — add meals in the Meals tab first' }
  }

  // 4. Fetch customer meal exclusions
  const { data: exclusionRows } = await supabase
    .from('customer_meal_exclusions')
    .select('meal_id')
    .eq('customer_id', customer.id)
  const excludedMealIds = new Set<string>(
    (exclusionRows ?? []).map((e: { meal_id: string }) => e.meal_id)
  )

  // 5. Assign meals from templates (respecting customer exclusions, cycling to fill slots)
  const totalSlots = Number(order.meals_per_week)
  const assigned = assignMealsFromTemplates(templates as MealTemplate[], meals as Meal[], excludedMealIds, totalSlots)

  if (assigned.length === 0) {
    return { error: 'Could not assign any meals — check meal templates' }
  }

  // 6. Delete existing production rows for this order (idempotency)
  const { error: delError } = await supabase
    .from('production')
    .delete()
    .eq('order_id', orderId)
  if (delError) return { error: delError.message }

  // 7. Insert new production rows
  const rows = assigned.map(meal => {
    const { g, flag } = calcBasePortionG(meal as Meal, order, customer)
    return {
      order_id: orderId,
      meal_id: meal.id,
      base_portion_size_g: g,
      flag_base_portion: flag,
      week_start: order.week_start,
    }
  })

  const { error: insError } = await supabase.from('production').insert(rows)
  if (insError) return { error: insError.message }

  return { error: null }
}

/** Delete all production rows for a given order (e.g. on cancellation). */
export async function deleteProductionRows(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('production').delete().eq('order_id', orderId)
  return { error: error?.message ?? null }
}

/**
 * Regenerate production rows for every currently-confirmed order.
 * Called when meals, ingredients, side recipes, or templates change.
 */
export async function regenerateAllConfirmedOrders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<{ error: string | null }> {
  // Only regenerate future weeks — current and past weeks are frozen
  const thisWeek = getThisWeekMonday()
  const { data: orders, error: fetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'confirmed')
    .gt('week_start', thisWeek)
  if (fetchError) return { error: fetchError.message }
  if (!orders || orders.length === 0) return { error: null }

  const errors: string[] = []
  for (const order of orders) {
    const { error } = await generateProductionRows(order.id, supabase)
    if (error) errors.push(error)
  }

  return { error: errors.length > 0 ? errors.join('; ') : null }
}
