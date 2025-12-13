-- Add columns for tracking encoding status if they don't exist
ALTER TABLE reseller_orders 
ADD COLUMN IF NOT EXISTS is_encoded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS encoded_by TEXT,
ADD COLUMN IF NOT EXISTS encoded_at TIMESTAMP WITH TIME ZONE;

-- Force refresh of the schema cache in Supabase (optional, but good practice)
NOTIFY pgrst, 'reload schema';
