'use server'

import { createServerClient } from '@/lib/supabase/server'
import { regenerateAllConfirmedOrders } from '@/lib/production'
import type { Ingredient, Meal, MealsPerWeek } from '@/lib/types'

// ── Ingredients ────────────────────────────────────────────────────────────────

export async function createIngredient(
  data: Omit<Ingredient, 'id' | 'created_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServerClient()
  const { data: row, error } = await supabase
    .from('ingredients')
    .insert(data)
    .select('id')
    .single()
  if (error) return { id: null, error: error.message }
  return { id: row.id, error: null }
}

export async function updateIngredient(
  id: string,
  data: Omit<Ingredient, 'id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const { error } = await supabase.from('ingredients').update(data).eq('id', id)
  if (error) return { error: error.message }
  // Ingredient kcal affects base portion calculations — regenerate all confirmed orders
  await regenerateAllConfirmedOrders(supabase)
  return { error: null }
}

// ── Side Recipes ───────────────────────────────────────────────────────────────

export async function saveSideRecipe(
  id: string | null,
  data: { name: string; total_kcal_per_portion: number | null },
  lines: { ingredient_id: string; portion_size_g: number }[]
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServerClient()

  let recipeId = id

  if (id) {
    const { error } = await supabase.from('side_recipes').update(data).eq('id', id)
    if (error) return { id: null, error: error.message }
  } else {
    const { data: row, error } = await supabase
      .from('side_recipes')
      .insert(data)
      .select('id')
      .single()
    if (error) return { id: null, error: error.message }
    recipeId = row.id
  }

  // Replace ingredient lines: delete existing, insert new
  if (id) {
    const { error: delError } = await supabase
      .from('side_recipe_ingredients')
      .delete()
      .eq('recipe_id', id)
    if (delError) return { id: null, error: delError.message }
  }

  if (lines.length > 0) {
    const rows = lines.map(l => ({ recipe_id: recipeId!, ...l }))
    const { error: insError } = await supabase.from('side_recipe_ingredients').insert(rows)
    if (insError) return { id: null, error: insError.message }
  }

  // Side recipe kcal affects base portion calculations — regenerate all confirmed orders
  await regenerateAllConfirmedOrders(supabase)
  return { id: recipeId, error: null }
}

// ── Meals ──────────────────────────────────────────────────────────────────────

export async function createMeal(
  data: Omit<Meal, 'id' | 'created_at' | 'protein' | 'base' | 'side'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServerClient()
  const { data: row, error } = await supabase
    .from('meals')
    .insert(data)
    .select('id')
    .single()
  if (error) return { id: null, error: error.message }
  return { id: row.id, error: null }
}

export async function updateMeal(
  id: string,
  data: Omit<Meal, 'id' | 'created_at' | 'protein' | 'base' | 'side'>
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const { error } = await supabase.from('meals').update(data).eq('id', id)
  if (error) return { error: error.message }
  // Meal changes affect production assignments — regenerate all confirmed orders
  await regenerateAllConfirmedOrders(supabase)
  return { error: null }
}

// ── Meal Templates ─────────────────────────────────────────────────────────────

export async function saveMealTemplate(
  meals_per_week: MealsPerWeek,
  position: number,
  meal_id: string | null
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('meal_templates')
    .upsert({ meals_per_week, position, meal_id }, { onConflict: 'meals_per_week,position' })
  if (error) return { error: error.message }
  // Template changes affect production assignments — regenerate all confirmed orders
  await regenerateAllConfirmedOrders(supabase)
  return { error: null }
}
