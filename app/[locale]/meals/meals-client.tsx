'use client'

import { useTranslations } from 'next-intl'
import { Box, Tabs } from '@radix-ui/themes'
import { IngredientsTab } from './ingredients-tab'
import { SideRecipesTab } from './side-recipes-tab'
import { MealsTab } from './meals-tab'
import { MealTemplatesTab } from './meal-templates-tab'
import type { Ingredient, MealTemplate, SideRecipe, Meal } from '@/lib/types'

interface MealsClientProps {
  /** Full list for forms (side recipe / meal editors). */
  ingredientsAll: Ingredient[]
  /** Ingredients tab table (server-filtered by `ingredients_q`, paginated). */
  ingredients: Ingredient[]
  ingredientsPagination: {
    page: number
    pageSize: number
    totalCount: number
    preserveParams: Record<string, string>
  }
  sideRecipesAll: SideRecipe[]
  sideRecipes: SideRecipe[]
  meals: Meal[]
  mealTemplates: MealTemplate[]
  searchQueries: {
    ingredients: string
    sideRecipes: string
    meals: string
  }
}

export function MealsClient({
  ingredientsAll,
  ingredients,
  ingredientsPagination,
  sideRecipesAll,
  sideRecipes,
  meals,
  mealTemplates,
  searchQueries,
}: MealsClientProps) {
  const t = useTranslations('meals')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">{t('title')}</h1>
      <div
        className="meals-radix-tabs w-full min-w-0"
        style={{ '--accent-indicator': 'var(--primary)' } as React.CSSProperties}
      >
        <Tabs.Root defaultValue="templates" className="w-full min-w-0">
          <Tabs.List>
            <Tabs.Trigger value="templates" className="data-[state=active]:!text-[var(--primary)]">
              {t('tabs.weeklyPlan')}
            </Tabs.Trigger>
            <Tabs.Trigger value="meals" className="data-[state=active]:!text-[var(--primary)]">
              {t('tabs.meals')}
            </Tabs.Trigger>
            <Tabs.Trigger value="side-recipes" className="data-[state=active]:!text-[var(--primary)]">
              {t('tabs.sideRecipes')}
            </Tabs.Trigger>
            <Tabs.Trigger value="ingredients" className="data-[state=active]:!text-[var(--primary)]">
              {t('tabs.ingredients')}
            </Tabs.Trigger>
          </Tabs.List>
          <Box pt="4">
            <Tabs.Content value="templates">
              <MealTemplatesTab templates={mealTemplates} meals={meals} />
            </Tabs.Content>
            <Tabs.Content value="meals">
              <MealsTab
                meals={meals}
                ingredients={ingredientsAll}
                sideRecipes={sideRecipesAll}
                searchQuery={searchQueries.meals}
              />
            </Tabs.Content>
            <Tabs.Content value="side-recipes">
              <SideRecipesTab
                sideRecipes={sideRecipes}
                sideIngredients={ingredientsAll.filter(i => i.type === 'side')}
                searchQuery={searchQueries.sideRecipes}
              />
            </Tabs.Content>
            <Tabs.Content value="ingredients">
              <IngredientsTab
                ingredients={ingredients}
                searchQuery={searchQueries.ingredients}
                page={ingredientsPagination.page}
                pageSize={ingredientsPagination.pageSize}
                totalCount={ingredientsPagination.totalCount}
                paginationPreserveParams={ingredientsPagination.preserveParams}
              />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </div>
    </div>
  )
}
