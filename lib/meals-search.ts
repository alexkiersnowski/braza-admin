import {
  parseCustomerSearchQuery,
  customerSearchIlikePattern,
} from '@/lib/customer-search'

export type MealsNameSearchParamKey =
  | 'ingredients_q'
  | 'side_recipes_q'
  | 'meals_q'

/** Query param for Ingredients tab pagination on `/meals` (avoids clashing with other tabs). */
export const MEALS_INGREDIENTS_PAGE_PARAM = 'ingredients_page' as const

export function parseMealsNameSearchQuery(
  raw: string | string[] | undefined,
): string | null {
  return parseCustomerSearchQuery(raw)
}

/** Safe `ilike` pattern for `name`, or null if empty after sanitize. */
export function mealsNameIlikePattern(trimmedQuery: string): string | null {
  return customerSearchIlikePattern(trimmedQuery)
}
