-- Text form of order_number for PostgREST ilike filters (casts are not allowed in WHERE).
ALTER TABLE orders ADD COLUMN order_number_search text
GENERATED ALWAYS AS (order_number::text) STORED;

CREATE INDEX orders_order_number_search_idx ON orders (order_number_search);
