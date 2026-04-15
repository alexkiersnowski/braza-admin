'use server'

import { calcProductionBasePortionG } from '@/lib/production'
import { createServerClient } from '@/lib/supabase/server'
import type { Meal } from '@/lib/types'

export async function updateProductionMeal(
  rowId: string,
  mealId: string
): Promise<{ error: string | null }> {
  const supabase = createServerClient()

  const [{ data: row, error: rowError }, { data: meal, error: mealError }] = await Promise.all([
    supabase
      .from('production')
      .select('*, orders(portion_size_g, customers(daily_calories))')
      .eq('id', rowId)
      .single(),
    supabase
      .from('meals')
      .select('*, protein:ingredients!protein_id(*), base:ingredients!base_id(*), side:side_recipes!sides_id(*)')
      .eq('id', mealId)
      .single(),
  ])

  if (rowError || !row) return { error: rowError?.message ?? 'Row not found' }
  if (mealError || !meal) return { error: mealError?.message ?? 'Meal not found' }

  const portionSizeG: number = row.orders?.portion_size_g ?? 0
  const dailyKcal: number | null = row.orders?.customers?.daily_calories ?? null
  const { g: base_portion_size_g, flag: flag_base_portion } = calcProductionBasePortionG(
    meal as Meal,
    portionSizeG,
    dailyKcal
  )

  const { error } = await supabase
    .from('production')
    .update({ meal_id: mealId, base_portion_size_g, flag_base_portion })
    .eq('id', rowId)

  return { error: error?.message ?? null }
}
