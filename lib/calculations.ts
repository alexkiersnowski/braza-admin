import type { ActivityLevel, CustomerGoal, CustomerSex } from '@/lib/types'

/**
 * Source of truth for customer metric calculations. Change only when business rules change
 * (e.g. Braza share, goals, meat-density / uplift constants). UI and persistence live elsewhere.
 */

export type CalculationInputs = {
  weight: number
  target_weight: number
  height: number
  age: number
  sex: CustomerSex
  activity_level: ActivityLevel
  goal: CustomerGoal
}

export type CalculationResults = {
  protein_multiplier: number
  daily_protein_g: number
  braza_protein_g: number
  protein_portion_size_g: number
  protein_uplift: boolean
  price_per_meal_pln: number
  daily_calories: number
}

/** Fixed portion tiers with per-meal prices. Snap raw portion up to the nearest tier. */
export const PORTION_TIERS = [
  { portion_g: 150, price_pln: 36 },
  { portion_g: 180, price_pln: 40 },
  { portion_g: 220, price_pln: 44 },
  { portion_g: 250, price_pln: 48 },
  { portion_g: 300, price_pln: 55 },
] as const

export const BASE_PORTION_G = 180
export const BASE_PRICE_PLN = 40

/** Flat surcharge added to order total when delivery type is delivery (not per meal). */
export const ORDER_DELIVERY_FEE_PLN = 20

/** PAL factors: multiply BMR to get TDEE (total daily energy expenditure). Widely used defaults. */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
}

/** Applied to TDEE so calorie target matches goal (deficit / maintenance / surplus). */
const GOAL_ADJUSTMENTS: Record<CustomerGoal, number> = {
  lose_weight: 0.85,
  maintain: 1.0,
  gain_muscle: 1.1,
}

export function calculateCustomerMetrics(inputs: CalculationInputs): CalculationResults {
  /** g protein per kg target body weight. Males building muscle use 2.0g/kg; all other cases use 1.6g/kg. */
  const protein_multiplier = inputs.goal === 'gain_muscle' && inputs.sex === 'male' ? 2.0 : 1.6

  const daily_protein_g = Math.round(inputs.target_weight * protein_multiplier * 10) / 10
  /** Share of daily protein assumed to come from Braza meals (rest from other eating). */
  const braza_protein_g = Math.round(daily_protein_g * 0.35 * 10) / 10
  /** 26 = g protein per 100g cooked meat (fixed). Raw g snapped up to nearest PORTION_TIER. */
  const rawPortionG = (braza_protein_g / 26) * 100
  const tier = PORTION_TIERS.find(t => t.portion_g >= rawPortionG) ?? PORTION_TIERS[PORTION_TIERS.length - 1]
  const protein_portion_size_g = tier.portion_g
  const price_per_meal_pln = tier.price_pln

  /** Uplift = portion exceeds the base 180g tier. */
  const protein_uplift = protein_portion_size_g > BASE_PORTION_G

  /** Mifflin–St Jeor BMR; weight kg, height cm, age years. +5 male / −161 female. */
  const bmr =
    inputs.sex === 'male'
      ? 10 * inputs.weight + 6.25 * inputs.height - 5 * inputs.age + 5
      : 10 * inputs.weight + 6.25 * inputs.height - 5 * inputs.age - 161

  const tdee = bmr * ACTIVITY_MULTIPLIERS[inputs.activity_level]
  const daily_calories = Math.round(tdee * GOAL_ADJUSTMENTS[inputs.goal])

  return {
    protein_multiplier,
    daily_protein_g,
    braza_protein_g,
    protein_portion_size_g,
    protein_uplift,
    price_per_meal_pln,
    daily_calories,
  }
}

/** Coarse “inputs present” guard via truthiness: `0` fails (acceptable for age/weight/height here). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canCalculate(c: any): c is CalculationInputs {
  return !!(
    c.weight &&
    c.target_weight &&
    c.height &&
    c.age &&
    c.sex &&
    c.activity_level &&
    c.goal
  )
}
