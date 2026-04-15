-- Soft delete support for meals, side recipes, and ingredients.
-- Setting deleted_at marks an item as deleted without removing it from the DB,
-- so existing production row joins continue to resolve correctly.

ALTER TABLE meals        ADD COLUMN deleted_at timestamptz;
ALTER TABLE side_recipes ADD COLUMN deleted_at timestamptz;
ALTER TABLE ingredients  ADD COLUMN deleted_at timestamptz;
