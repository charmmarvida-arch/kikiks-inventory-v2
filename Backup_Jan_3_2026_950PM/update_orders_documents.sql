-- ========================================
-- UPDATE ORDERS DOCUMENTS (View vs Create)
-- ========================================

-- Add columns to track if documents have been created
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS has_packing_list BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_coa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coa_data JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS policies are correct (Re-apply just in case)
ALTER TABLE reseller_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for reseller_orders" ON reseller_orders;
CREATE POLICY "Enable all for reseller_orders" ON reseller_orders FOR ALL USING (true) WITH CHECK (true);
