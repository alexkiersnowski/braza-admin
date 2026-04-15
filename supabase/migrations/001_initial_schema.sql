-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE customer_type AS ENUM ('standard', 'performance');
CREATE TYPE customer_sex AS ENUM ('male', 'female');
CREATE TYPE customer_goal AS ENUM ('lose_weight', 'maintain', 'gain_muscle');
CREATE TYPE ingredient_type AS ENUM ('protein', 'base', 'side');
CREATE TYPE meals_per_week AS ENUM ('2', '5', '10', '14');
CREATE TYPE payment_status AS ENUM ('pending', 'paid');
CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Tables

CREATE TABLE IF NOT EXISTS customers (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              timestamp DEFAULT now(),
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  whatsapp_number         text NOT NULL,
  type                    customer_type NOT NULL DEFAULT 'standard',
  exclude_beef            boolean,
  exclude_chicken         boolean,
  exclude_pork            boolean,
  allergies               text,
  address                 text NOT NULL,
  sex                     customer_sex,
  age                     numeric,
  weight                  numeric,
  target_weight           numeric,
  height                  numeric,
  activity_level          text,
  goal                    customer_goal,
  protein_multiplier      numeric,
  daily_calories          numeric,
  daily_protein_g         numeric,
  braza_protein_g         numeric,
  protein_portion_size_g  numeric,
  protein_uplift          boolean,
  protein_uplift_cost_zl  numeric
);

CREATE TABLE IF NOT EXISTS ingredients (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at                timestamp DEFAULT now(),
  name                      text NOT NULL,
  type                      ingredient_type NOT NULL,
  cooked_kcal_per_100g      numeric,
  cooked_protein_g_per_100g numeric
);

CREATE TABLE IF NOT EXISTS side_recipes (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at           timestamp DEFAULT now(),
  name                 text NOT NULL,
  total_kcal_per_portion numeric
);

CREATE TABLE IF NOT EXISTS side_recipe_ingredients (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    timestamp DEFAULT now(),
  recipe_id     uuid NOT NULL REFERENCES side_recipes(id),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id),
  portion_size_g numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  name       text NOT NULL,
  protein_id uuid NOT NULL REFERENCES ingredients(id),
  base_id    uuid NOT NULL REFERENCES ingredients(id),
  sides_id   uuid NOT NULL REFERENCES side_recipes(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at           timestamp DEFAULT now(),
  customer_id          uuid NOT NULL REFERENCES customers(id),
  week_start           date NOT NULL,
  meals_per_week       meals_per_week NOT NULL DEFAULT '5',
  price_pln            numeric NOT NULL,
  payment_status       payment_status NOT NULL DEFAULT 'pending',
  payment_received_at  timestamp,
  order_confirmed_at   timestamp,
  delivery_type        delivery_type NOT NULL DEFAULT 'delivery',
  delivery_address     text,
  notes                text,
  status               order_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS production (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at         timestamp DEFAULT now(),
  order_id           uuid NOT NULL REFERENCES orders(id),
  meal_id            uuid NOT NULL REFERENCES meals(id),
  base_portion_size_g numeric NOT NULL,
  notes              text
);
