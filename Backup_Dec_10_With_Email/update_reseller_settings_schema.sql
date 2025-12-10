-- Add start_date column to reseller_settings table
ALTER TABLE reseller_settings 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- Comment on column
COMMENT ON COLUMN reseller_settings.start_date IS 'The starting date for the reseller''s monthly compliance cycle';
