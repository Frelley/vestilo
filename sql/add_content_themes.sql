ALTER TABLE products ADD COLUMN IF NOT EXISTS content_themes text[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_entities text[] DEFAULT '{}';
