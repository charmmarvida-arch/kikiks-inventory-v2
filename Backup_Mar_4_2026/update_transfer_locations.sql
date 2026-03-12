-- Migration: Set from_location for old transfer records
-- The table uses 'destination' for TO location and 'from_location' for FROM location

-- Step 1: Update records that don't have from_location set
-- Set default to 'FTF Manufacturing' (the main warehouse)
UPDATE transfer_orders 
SET from_location = 'FTF Manufacturing' 
WHERE from_location IS NULL OR from_location = '';

-- Step 2: Verification - Show all transfers to Sorsogon
SELECT 
    id,
    from_location,
    destination as to_location,
    date,
    total_amount,
    status
FROM transfer_orders 
WHERE destination ILIKE '%sorsogon%'
ORDER BY date DESC;

-- Step 3: Show all transfers to verify the update
SELECT 
    id,
    from_location,
    destination,
    date,
    total_amount,
    status
FROM transfer_orders 
ORDER BY date DESC 
LIMIT 20;
