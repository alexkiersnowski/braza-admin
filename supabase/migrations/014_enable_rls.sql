-- Enable RLS on all tables.
-- The server-side service role key (SUPABASE_SECRET_KEY) bypasses RLS automatically,
-- so no explicit policies are needed for server operations.
-- This blocks all direct access via the public anon key.

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_meal_exclusions ENABLE ROW LEVEL SECURITY;
