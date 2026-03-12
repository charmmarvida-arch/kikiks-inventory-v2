-- ===================================================
-- FINAL DATABASE UPDATE SCRIPT (Run this in Supabase)
-- ===================================================

-- 1. Update reseller_orders table with ALL missing columns
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS reseller_id TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS has_packing_list BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_coa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coa_data JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate old 'total' data if it exists (Safety check)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reseller_orders' AND column_name = 'total') THEN
        UPDATE reseller_orders SET total_amount = total WHERE total_amount IS NULL;
    END IF;
END $$;

-- 3. Update transfer_orders table
ALTER TABLE transfer_orders
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfer_orders' AND column_name = 'total') THEN
        UPDATE transfer_orders SET total_amount = total WHERE total_amount IS NULL;
    END IF;
END $$;

-- 4. Re-apply Row Level Security (RLS) Policies to ensure saving works
ALTER TABLE reseller_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for reseller_orders" ON reseller_orders;
CREATE POLICY "Enable all for reseller_orders" ON reseller_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for transfer_orders" ON transfer_orders;
CREATE POLICY "Enable all for transfer_orders" ON transfer_orders FOR ALL USING (true) WITH CHECK (true);

-- 5. Ensure app_settings exists for COA sequence
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for app_settings" ON app_settings;
CREATE POLICY "Enable all for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Initialize COA sequence if not exists
INSERT INTO app_settings (key, value)
VALUES ('coa_sequence', '104'::jsonb)
ON CONFLICT (key) DO NOTHING;
