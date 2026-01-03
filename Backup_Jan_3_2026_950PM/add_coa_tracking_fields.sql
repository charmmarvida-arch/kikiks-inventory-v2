-- ========================================
-- Add COA and Encoding Tracking Fields to reseller_orders
-- ========================================
-- This migration adds tracking fields for:
-- 1. Who created the COA document
-- 2. Who marked the order as encoded
-- 3. Encoding status and timestamp

-- Add created_by field (tracks who created the COA)
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add encoded_by field (tracks who marked it as encoded)
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS encoded_by TEXT;

-- Add is_encoded field (encoding status)
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS is_encoded BOOLEAN DEFAULT FALSE;

-- Add encoded_at field (when it was marked as encoded)
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS encoded_at TIMESTAMPTZ;

-- Create index for filtering by encoding status
CREATE INDEX IF NOT EXISTS idx_reseller_orders_is_encoded 
ON reseller_orders(is_encoded);

-- Create index for filtering by created_by
CREATE INDEX IF NOT EXISTS idx_reseller_orders_created_by 
ON reseller_orders(created_by);

COMMENT ON COLUMN reseller_orders.created_by IS 'User who created the COA document';
COMMENT ON COLUMN reseller_orders.encoded_by IS 'User who marked the order as encoded in the finance system';
COMMENT ON COLUMN reseller_orders.is_encoded IS 'Whether the order has been encoded in the finance system';
COMMENT ON COLUMN reseller_orders.encoded_at IS 'Timestamp when the order was marked as encoded';
