-- ============================================================
-- Add SKU Column to Legazpi Storage Inventory
-- ============================================================

-- Step 1: Add SKU column
ALTER TABLE legazpi_storage_inventory 
ADD COLUMN IF NOT EXISTS sku VARCHAR(50);

-- Step 2: Generate SKUs based on product names
-- This uses a window function to assign sequential numbers within each category

-- Cups (FGC)
WITH cup_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY product_name, flavor) as rn
  FROM legazpi_storage_inventory
  WHERE product_name ILIKE '%cup%'
)
UPDATE legazpi_storage_inventory 
SET sku = 'FGC-' || LPAD(cup_products.rn::text, 3, '0')
FROM cup_products
WHERE legazpi_storage_inventory.id = cup_products.id;

-- Pints (FGP)
WITH pint_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY product_name, flavor) as rn
  FROM legazpi_storage_inventory
  WHERE product_name ILIKE '%pint%'
)
UPDATE legazpi_storage_inventory 
SET sku = 'FGP-' || LPAD(pint_products.rn::text, 3, '0')
FROM pint_products
WHERE legazpi_storage_inventory.id = pint_products.id;

-- Liters (FGL)
WITH liter_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY product_name, flavor) as rn
  FROM legazpi_storage_inventory
  WHERE product_name ILIKE '%liter%' OR product_name ILIKE '%litre%'
)
UPDATE legazpi_storage_inventory 
SET sku = 'FGL-' || LPAD(liter_products.rn::text, 3, '0')
FROM liter_products
WHERE legazpi_storage_inventory.id = liter_products.id;

-- Gallons (FGG)
WITH gallon_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY product_name, flavor) as rn
  FROM legazpi_storage_inventory
  WHERE product_name ILIKE '%gallon%'
)
UPDATE legazpi_storage_inventory 
SET sku = 'FGG-' || LPAD(gallon_products.rn::text, 3, '0')
FROM gallon_products
WHERE legazpi_storage_inventory.id = gallon_products.id;

-- Trays (FGT)
WITH tray_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY product_name, flavor) as rn
  FROM legazpi_storage_inventory
  WHERE product_name ILIKE '%tray%'
)
UPDATE legazpi_storage_inventory 
SET sku = 'FGT-' || LPAD(tray_products.rn::text, 3, '0')
FROM tray_products
WHERE legazpi_storage_inventory.id = tray_products.id;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_legazpi_sku ON legazpi_storage_inventory(sku);

-- Step 4: Verification
SELECT sku, product_name, flavor, quantity 
FROM legazpi_storage_inventory 
ORDER BY sku 
LIMIT 20;
