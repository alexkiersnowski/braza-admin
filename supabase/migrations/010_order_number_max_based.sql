-- Replace BIGSERIAL order_number with a trigger-based MAX+1 assignment.
-- This ensures: empty table → #1, last is #20 → next is #21,
-- #21 deleted → next is still #21 (based on MAX, not COUNT).

-- 1. Drop the sequence default from the BIGSERIAL column
ALTER TABLE orders ALTER COLUMN order_number DROP DEFAULT;

-- 2. Drop the auto-generated sequence (BIGSERIAL creates one named orders_order_number_seq)
DROP SEQUENCE IF EXISTS orders_order_number_seq;

-- 3. Trigger function: sets order_number to MAX(order_number) + 1 on insert
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := COALESCE((SELECT MAX(order_number) FROM orders), 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_order_number();
