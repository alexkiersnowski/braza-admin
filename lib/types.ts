export type CustomerType = 'standard' | 'performance'
export type CustomerSex = 'male' | 'female'
export type CustomerGoal = 'lose_weight' | 'maintain' | 'gain_muscle'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high'
export type MealsPerWeek = '2' | '5' | '10' | '14'
export type PaymentStatus = 'pending' | 'paid'
export type DeliveryType = 'delivery' | 'pickup'
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled'

export interface CustomerMealExclusion {
  id: string
  customer_id: string
  meal_id: string
}

export interface Customer {
  id: string
  created_at: string
  first_name: string
  last_name: string
  whatsapp_number: string
  /** Present on rows from DB: generated from `whatsapp_number` without whitespace. */
  whatsapp_search?: string
  address: string | null
  type: CustomerType
  /** Populated when fetched with customer_meal_exclusions join. */
  excluded_meals?: { id: string; name: string }[]
  allergies: string | null
  sex: CustomerSex | null
  age: number | null
  weight: number | null
  target_weight: number | null
  height: number | null
  activity_level: ActivityLevel | null
  goal: CustomerGoal | null
  protein_multiplier: number | null
  daily_calories: number | null
  daily_protein_g: number | null
  braza_protein_g: number | null
  protein_portion_size_g: number | null
  protein_uplift: boolean | null
  price_per_meal_pln: number | null
}

export type IngredientType = 'protein' | 'base' | 'side'

export interface Ingredient {
  id: string
  created_at: string
  name: string
  type: IngredientType
  cooked_kcal_per_100g: number | null
  cooked_protein_g_per_100g: number | null
  yield_factor: number
  deleted_at?: string | null
}

export interface SideRecipeIngredient {
  id: string
  created_at: string
  recipe_id: string
  ingredient_id: string
  portion_size_g: number
  ingredients?: Ingredient
}

export interface SideRecipe {
  id: string
  created_at: string
  name: string
  total_kcal_per_portion: number | null
  side_recipe_ingredients?: SideRecipeIngredient[]
  deleted_at?: string | null
}

export interface Meal {
  id: string
  created_at: string
  name: string
  protein_id: string
  base_id: string
  sides_id: string
  protein?: Ingredient
  base?: Ingredient
  side?: SideRecipe
  deleted_at?: string | null
}

export interface MealTemplate {
  id: string
  created_at: string
  meals_per_week: MealsPerWeek
  position: number
  meal_id: string | null
}

export interface ProductionRow {
  id: string
  created_at: string
  order_id: string
  meal_id: string
  base_portion_size_g: number
  flag_base_portion: boolean
  week_start: string | null
  notes: string | null
  orders?: Order & { customers?: Pick<Customer, 'first_name' | 'last_name'> }
  meals?: Meal
}

export interface Order {
  id: string
  created_at: string
  order_number: number
  customer_id: string
  week_start: string
  meals_per_week: MealsPerWeek
  portion_size_g: number
  price_per_meal_pln: number
  price_pln: number
  payment_status: PaymentStatus
  payment_received_at: string | null
  order_confirmed_at: string | null
  delivery_type: DeliveryType
  delivery_address: string | null
  notes: string | null
  status: OrderStatus
}
