-- Digits-only phone key: matches search "48572" / "+48572" to stored "+48 572" (avoids + in URL filters)
ALTER TABLE customers DROP COLUMN IF EXISTS whatsapp_search;
ALTER TABLE customers ADD COLUMN whatsapp_search text
GENERATED ALWAYS AS (
  regexp_replace(whatsapp_number, '[^0-9]', '', 'g')
) STORED;
