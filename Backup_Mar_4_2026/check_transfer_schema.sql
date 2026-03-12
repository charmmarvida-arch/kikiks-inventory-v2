-- Step 1: First, let's see the current structure of transfer_orders
-- Run this to see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transfer_orders'
ORDER BY ordinal_position;
