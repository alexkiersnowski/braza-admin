-- Redesign meal_templates: ordered meal slots instead of protein type quantities

-- Remove old content and constraints
TRUNCATE meal_templates;

ALTER TABLE meal_templates
  DROP CONSTRAINT meal_templates_meals_per_week_protein_type_key;

ALTER TABLE meal_templates
  DROP COLUMN protein_type,
  DROP COLUMN quantity;

ALTER TABLE meal_templates
  ADD COLUMN position integer NOT NULL DEFAULT 1,
  ADD COLUMN meal_id uuid REFERENCES meals(id) ON DELETE SET NULL;

ALTER TABLE meal_templates
  ADD CONSTRAINT meal_templates_meals_per_week_position_key UNIQUE (meals_per_week, position);
