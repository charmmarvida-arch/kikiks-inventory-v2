-- Fix Row Level Security for transfer_orders table
-- This allows SELECT operations to work properly

-- Drop existing policy
DROP POLICY IF EXISTS "Enable all for transfer_orders" ON transfer_orders;

-- Create new policy that allows all operations
CREATE POLICY "Allow all operations on transfer_orders" 
ON transfer_orders 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;

-- Test the policy by selecting data
SELECT * FROM transfer_orders ORDER BY date DESC LIMIT 5;
