-- SAFE MIGRATION SCRIPT
-- Handles cases where 'sku' column might be missing or 'size_category' already exists.

DO $$
BEGIN
    -- 1. Ensure 'size_category' column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'branch_capacity_settings' 
        AND column_name = 'size_category'
    ) THEN
        ALTER TABLE branch_capacity_settings ADD COLUMN size_category TEXT;
    END IF;

    -- 2. Ensure 'sku' column exists and is nullable
    -- (The previous error "column sku does not exist" suggests it might be missing entirely in your setup)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'branch_capacity_settings' 
        AND column_name = 'sku'
    ) THEN
        -- If missing, we add it as nullable TEXT
        ALTER TABLE branch_capacity_settings ADD COLUMN sku TEXT;
    ELSE
        -- If it exists, ensure it allows NULL values
        ALTER TABLE branch_capacity_settings ALTER COLUMN sku DROP NOT NULL;
    END IF;

END $$;

-- 3. Create Unique Index for Size Category based capacities
-- This ensures we don't have duplicate settings for "Branch A + Cups"
DROP INDEX IF EXISTS idx_branch_capacity_unique_size;
CREATE UNIQUE INDEX idx_branch_capacity_unique_size ON branch_capacity_settings (branch_location, size_category) WHERE size_category IS NOT NULL;

-- 4. Comment for clarity
COMMENT ON COLUMN branch_capacity_settings.size_category IS 'Category of the product size (e.g., Cups, Pints) for capacity planning';
