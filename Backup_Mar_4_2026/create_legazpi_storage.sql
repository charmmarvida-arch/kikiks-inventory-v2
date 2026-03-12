-- Migration Script: Create Legazpi Storage Inventory System
-- This script creates the Legazpi Storage inventory table and updates the transfer system

-- ============================================================
-- STEP 1: Create legazpi_storage_inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS legazpi_storage_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name VARCHAR(255) NOT NULL,
  flavor VARCHAR(255),
  quantity INTEGER DEFAULT 0,
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Copy all products from inventory to legazpi_storage_inventory with 0 quantity
-- ============================================================
-- Note: inventory table has columns: sku, description, uom, quantity
-- We map: description -> product_name, NULL -> flavor, uom -> unit
INSERT INTO legazpi_storage_inventory (product_name, flavor, quantity, unit)
SELECT 
  description as product_name,  -- Map description to product_name
  NULL as flavor,                -- No flavor column in source, set to NULL
  0 as quantity,                 -- Set all quantities to 0
  uom as unit                    -- Map uom to unit
FROM inventory
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 3: Update transfer_orders table to include from_location
-- ============================================================
-- Add from_location column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfer_orders' AND column_name = 'from_location'
  ) THEN
    ALTER TABLE transfer_orders 
    ADD COLUMN from_location VARCHAR(100) DEFAULT 'FTF Manufacturing';
  END IF;
END $$;

-- Update existing transfer_orders to have from_location
UPDATE transfer_orders 
SET from_location = 'FTF Manufacturing' 
WHERE from_location IS NULL;

-- Rename location_name to to_location for clarity (if needed)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfer_orders' AND column_name = 'location_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transfer_orders' AND column_name = 'to_location'
  ) THEN
    ALTER TABLE transfer_orders 
    RENAME COLUMN location_name TO to_location;
  END IF;
END $$;

-- ============================================================
-- STEP 4: Create trigger for updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_legazpi_storage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legazpi_storage_updated_at
BEFORE UPDATE ON legazpi_storage_inventory
FOR EACH ROW
EXECUTE FUNCTION update_legazpi_storage_timestamp();

-- ============================================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE legazpi_storage_inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" 
ON legazpi_storage_inventory
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- STEP 6: Grant permissions
-- ============================================================
GRANT ALL ON legazpi_storage_inventory TO authenticated;
GRANT ALL ON legazpi_storage_inventory TO service_role;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the migration was successful:

-- Check if legazpi_storage_inventory table was created
-- SELECT COUNT(*) as total_products FROM legazpi_storage_inventory;

-- Check if all products were copied with 0 quantity
-- SELECT product_name, flavor, quantity FROM legazpi_storage_inventory LIMIT 10;

-- Check if transfer_orders table has new columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transfer_orders';

-- Check recent transfer_orders
-- SELECT id, from_location, to_location, created_at FROM transfer_orders ORDER BY created_at DESC LIMIT 5;
