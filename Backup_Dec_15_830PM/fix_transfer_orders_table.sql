-- Step 1: Check if transfer_orders table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'transfer_orders';

-- Step 2: If the above returns nothing, the table doesn't exist!
-- Run this to create it with the correct schema:

CREATE TABLE IF NOT EXISTS transfer_orders (
    id TEXT PRIMARY KEY,
    from_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC(10, 2),
    date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Unread',
    is_deducted BOOLEAN DEFAULT FALSE,
    has_packing_list BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policy to allow all operations
DROP POLICY IF EXISTS "Enable all for transfer_orders" ON transfer_orders;
CREATE POLICY "Enable all for transfer_orders" 
ON transfer_orders 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfer_orders_date ON transfer_orders(date DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_destination ON transfer_orders(destination);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_status ON transfer_orders(status);

-- Step 6: Verify the table was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transfer_orders'
ORDER BY ordinal_position;
