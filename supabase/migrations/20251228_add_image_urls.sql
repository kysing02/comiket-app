-- Add image_urls column to circles table to support multiple price list images
ALTER TABLE circles ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Migrate existing map_url to image_urls
-- This ensures old records with a map_url (but no image_urls) get that data migrated
UPDATE circles
SET image_urls = ARRAY[map_url]
WHERE (map_url IS NOT NULL AND map_url <> '')
  AND (image_urls IS NULL OR image_urls = '{}');
