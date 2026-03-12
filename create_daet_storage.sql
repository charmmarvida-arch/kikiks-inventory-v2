-- Migration Script: Create Daet Storage Inventory System
-- This script creates the Daet Storage inventory table and updates the transfer system

-- ============================================================
-- STEP 1: Create daet_storage_inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS daet_storage_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  flavor VARCHAR(255),
  quantity INTEGER DEFAULT 0,
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Copy all products from inventory to daet_storage_inventory with 0 quantity
-- ============================================================
INSERT INTO daet_storage_inventory (sku, product_name, flavor, quantity, unit)
SELECT 
  sku,
  description as product_name, 
  NULL as flavor,                
  0 as quantity,                 
  uom as unit                    
FROM inventory
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 3: Create trigger for updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_daet_storage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daet_storage_updated_at
BEFORE UPDATE ON daet_storage_inventory
FOR EACH ROW
EXECUTE FUNCTION update_daet_storage_timestamp();

-- ============================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE daet_storage_inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" 
ON daet_storage_inventory
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- STEP 5: Grant permissions
-- ============================================================
GRANT ALL ON daet_storage_inventory TO authenticated;
GRANT ALL ON daet_storage_inventory TO service_role;
