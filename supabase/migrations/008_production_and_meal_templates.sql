-- Meal templates: how many meals of each protein type per meals_per_week level
CREATE TABLE IF NOT EXISTS meal_templates (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       timestamp DEFAULT now(),
  meals_per_week   meals_per_week NOT NULL,
  protein_type     text NOT NULL,  -- 'chicken', 'beef', 'pork'
  quantity         integer NOT NULL DEFAULT 0,
  UNIQUE(meals_per_week, protein_type)
);

-- Add flag + week_start to production table
ALTER TABLE production ADD COLUMN IF NOT EXISTS flag_base_portion boolean NOT NULL DEFAULT false;
ALTER TABLE production ADD COLUMN IF NOT EXISTS week_start date;

-- Seed default meal templates
INSERT INTO meal_templates (meals_per_week, protein_type, quantity) VALUES
  ('2',  'chicken', 1),
  ('2',  'beef',    1),
  ('2',  'pork',    0),
  ('5',  'chicken', 3),
  ('5',  'beef',    1),
  ('5',  'pork',    1),
  ('10', 'chicken', 6),
  ('10', 'beef',    2),
  ('10', 'pork',    2),
  ('14', 'chicken', 8),
  ('14', 'beef',    3),
  ('14', 'pork',    3)
ON CONFLICT (meals_per_week, protein_type) DO NOTHING;
