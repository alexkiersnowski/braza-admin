-- Replace protein boolean exclusions with a meal-level junction table.
-- Each row means: this customer does not eat this specific meal.

CREATE TABLE customer_meal_exclusions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  meal_id     uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  UNIQUE (customer_id, meal_id)
);

ALTER TABLE customers
  DROP COLUMN IF EXISTS exclude_beef,
  DROP COLUMN IF EXISTS exclude_chicken,
  DROP COLUMN IF EXISTS exclude_pork;
