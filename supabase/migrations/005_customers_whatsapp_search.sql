-- Space-insensitive phone search: matches "+48572" against stored "+48 572"
ALTER TABLE customers
ADD COLUMN whatsapp_search text
GENERATED ALWAYS AS (
  regexp_replace(whatsapp_number, '[[:space:]]', '', 'g')
) STORED;
