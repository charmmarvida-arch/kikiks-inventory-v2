-- Check transfer_orders table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transfer_orders'
ORDER BY ordinal_position;
