ALTER TABLE orders ADD COLUMN order_number BIGSERIAL NOT NULL;
CREATE UNIQUE INDEX orders_order_number_idx ON orders (order_number);
