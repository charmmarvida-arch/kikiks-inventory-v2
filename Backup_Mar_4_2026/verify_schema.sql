-- Check the exact current schema of transfer_orders table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transfer_orders'
ORDER BY ordinal_position;
