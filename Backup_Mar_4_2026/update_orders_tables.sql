-- ========================================
-- UPDATE ORDERS TABLES (Fix Persistence)
-- ========================================

-- 1. Update reseller_orders table
-- Add missing columns if they don't exist
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS reseller_id TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

-- If 'total' column exists, migrate data to 'total_amount' and drop 'total'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reseller_orders' AND column_name = 'total') THEN
        UPDATE reseller_orders SET total_amount = total WHERE total_amount IS NULL;
        -- Optional: ALTER TABLE reseller_orders DROP COLUMN total;
    END IF;
END $$;

-- 2. Update transfer_orders table
ALTER TABLE transfer_orders
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfer_orders' AND column_name = 'total') THEN
        UPDATE transfer_orders SET total_amount = total WHERE total_amount IS NULL;
    END IF;
END $$;

-- 3. Ensure RLS policies are correct (Re-apply just in case)
ALTER TABLE reseller_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for reseller_orders" ON reseller_orders;
CREATE POLICY "Enable all for reseller_orders" ON reseller_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for transfer_orders" ON transfer_orders;
CREATE POLICY "Enable all for transfer_orders" ON transfer_orders FOR ALL USING (true) WITH CHECK (true);
