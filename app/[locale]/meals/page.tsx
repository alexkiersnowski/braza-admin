import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  parseMealsNameSearchQuery,
  mealsNameIlikePattern,
  MEALS_INGREDIENTS_PAGE_PARAM,
} from '@/lib/meals-search'
import {
  TABLE_PAGE_SIZE,
  parsePageParam,
  clampPage,
  rangeForPage,
} from '@/lib/pagination'
import { MealsClient } from './meals-client'
import type { Ingredient, MealTemplate, SideRecipe, Meal } from '@/lib/types'

export const dynamic = 'force-dynamic'

function buildMealsListSearchParams(opts: {
  ingredientsQ: string
  sideRecipesQ: string
  mealsQ: string
  ingredientsPage: number
}): string {
  const p = new URLSearchParams()
  if (opts.ingredientsQ) p.set('ingredients_q', opts.ingredientsQ)
  if (opts.sideRecipesQ) p.set('side_recipes_q', opts.sideRecipesQ)
  if (opts.mealsQ) p.set('meals_q', opts.mealsQ)
  if (opts.ingredientsPage > 1) p.set(MEALS_INGREDIENTS_PAGE_PARAM, String(opts.ingredientsPage))
  const q = p.toString()
  return q ? `?${q}` : ''
}

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ingredients_q?: string
    side_recipes_q?: string
    meals_q?: string
    ingredients_page?: string
  }>
}) {
  const sp = await searchParams
  const ingredientsQ = parseMealsNameSearchQuery(sp.ingredients_q)
  const sideRecipesQ = parseMealsNameSearchQuery(sp.side_recipes_q)
  const mealsQ = parseMealsNameSearchQuery(sp.meals_q)

  const ingredientsPattern = ingredientsQ ? mealsNameIlikePattern(ingredientsQ) : null
  const sideRecipesPattern = sideRecipesQ ? mealsNameIlikePattern(sideRecipesQ) : null
  const mealsPattern = mealsQ ? mealsNameIlikePattern(mealsQ) : null

  const supabase = createServerClient()

  const sideRecipesSelect =
    '*, side_recipe_ingredients(*, ingredients(*))' as const
  const mealsSelect =
    '*, protein:ingredients!protein_id(*), base:ingredients!base_id(*), side:side_recipes!sides_id(*)' as const

  const { data: ingredientsAll } = await supabase
    .from('ingredients')
    .select('*')
    .is('deleted_at', null)
    .order('name')

  let ingredientsCountQuery = supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
  if (ingredientsPattern != null) {
    ingredientsCountQuery = ingredientsCountQuery.ilike('name', ingredientsPattern)
  }
  const { count: ingredientsMatchCount } = await ingredientsCountQuery
  const totalIngredientsForList = ingredientsMatchCount ?? 0

  const requestedIngredientsPage = parsePageParam(sp.ingredients_page)
  const ingredientsPage = clampPage(
    requestedIngredientsPage,
    totalIngredientsForList,
    TABLE_PAGE_SIZE,
  )

  if (requestedIngredientsPage !== ingredientsPage) {
    redirect(
      `/meals${buildMealsListSearchParams({
        ingredientsQ: ingredientsQ ?? '',
        sideRecipesQ: sideRecipesQ ?? '',
        mealsQ: mealsQ ?? '',
        ingredientsPage,
      })}`,
    )
  }

  const { from, to } = rangeForPage(ingredientsPage, TABLE_PAGE_SIZE)
  let ingredientsTableQuery = supabase.from('ingredients').select('*').is('deleted_at', null).order('name')
  if (ingredientsPattern != null) {
    ingredientsTableQuery = ingredientsTableQuery.ilike('name', ingredientsPattern)
  }
  const { data: ingredientsPageRows } = await ingredientsTableQuery.range(from, to)
  const ingredientsList = (ingredientsPageRows ?? []) as Ingredient[]

  const { data: sideRecipesAll } = await supabase
    .from('side_recipes')
    .select(sideRecipesSelect)
    .is('deleted_at', null)
    .order('name')

  const sideRecipesList =
    sideRecipesPattern != null
      ? (
          await supabase
            .from('side_recipes')
            .select(sideRecipesSelect)
            .is('deleted_at', null)
            .ilike('name', sideRecipesPattern)
            .order('name')
        ).data ?? []
      : (sideRecipesAll ?? [])

  let mealsQuery = supabase.from('meals').select(mealsSelect).is('deleted_at', null).order('name')
  if (mealsPattern != null) {
    mealsQuery = mealsQuery.ilike('name', mealsPattern)
  }
  const { data: mealsList } = await mealsQuery

  const { data: mealTemplates } = await supabase
    .from('meal_templates')
    .select('*')
    .order('meals_per_week')
    .order('position')

  const ingredientsPaginationPreserve: Record<string, string> = {}
  if (ingredientsQ) ingredientsPaginationPreserve.ingredients_q = ingredientsQ
  if (sideRecipesQ) ingredientsPaginationPreserve.side_recipes_q = sideRecipesQ
  if (mealsQ) ingredientsPaginationPreserve.meals_q = mealsQ

  return (
    <MealsClient
      ingredientsAll={(ingredientsAll ?? []) as Ingredient[]}
      ingredients={ingredientsList}
      ingredientsPagination={{
        page: ingredientsPage,
        pageSize: TABLE_PAGE_SIZE,
        totalCount: totalIngredientsForList,
        preserveParams: ingredientsPaginationPreserve,
      }}
      sideRecipesAll={(sideRecipesAll ?? []) as SideRecipe[]}
      sideRecipes={(sideRecipesList ?? []) as SideRecipe[]}
      meals={(mealsList ?? []) as Meal[]}
      mealTemplates={(mealTemplates ?? []) as MealTemplate[]}
      searchQueries={{
        ingredients: ingredientsQ ?? '',
        sideRecipes: sideRecipesQ ?? '',
        meals: mealsQ ?? '',
      }}
    />
  )
}
