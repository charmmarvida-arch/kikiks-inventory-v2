-- Add missing columns to transfer_orders table
ALTER TABLE transfer_orders 
ADD COLUMN IF NOT EXISTS has_packing_list BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
