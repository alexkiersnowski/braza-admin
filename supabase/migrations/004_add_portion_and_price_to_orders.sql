ALTER TABLE orders
  ADD COLUMN portion_size_g     numeric NOT NULL DEFAULT 180,
  ADD COLUMN price_per_meal_pln numeric NOT NULL DEFAULT 40;
