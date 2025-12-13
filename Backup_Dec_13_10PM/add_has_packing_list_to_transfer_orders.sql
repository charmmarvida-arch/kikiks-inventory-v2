-- Add has_packing_list column to transfer_orders table
-- This tracks whether a packing list document has been generated for each transfer order

ALTER TABLE transfer_orders 
ADD COLUMN IF NOT EXISTS has_packing_list BOOLEAN DEFAULT false;

-- Update existing records to have has_packing_list = false
UPDATE transfer_orders 
SET has_packing_list = false 
WHERE has_packing_list IS NULL;
