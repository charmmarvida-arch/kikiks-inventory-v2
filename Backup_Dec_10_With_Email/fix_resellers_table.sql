-- Fix Resellers Table - Change ID type and add location column
-- Copy and paste this entire file into your Supabase SQL Editor and click "Run"

-- First, delete any existing data (if any)
DELETE FROM resellers;

-- Change the id column from UUID to TEXT to match what the app generates
ALTER TABLE resellers ALTER COLUMN id TYPE TEXT;

-- Add the 'location' column to the resellers table
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS location TEXT;

-- Now insert the sample resellers
INSERT INTO resellers (id, name, location) VALUES
  ('1732804800001', 'Marias Ice Cream Shop', 'Sorsogon City'),
  ('1732804800002', 'Johns Convenience Store', 'Legazpi City'),
  ('1732804800003', 'Saras Sari-Sari Store', 'Within Sorsogon City (Juban, Matnog, Bulusan)'),
  ('1732804800004', 'Bens Mini Mart', 'Naga'),
  ('1732804800005', 'Litas Store', 'Daet')
ON CONFLICT (id) DO NOTHING;
