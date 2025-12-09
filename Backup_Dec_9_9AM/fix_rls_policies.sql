-- ========================================
-- FIX SUPABASE CORS/RLS POLICY ISSUE
-- ========================================
-- This script will fix the RLS policies to allow public access
-- Run this in your Supabase SQL Editor

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all for inventory" ON inventory;
DROP POLICY IF EXISTS "Enable all for resellers" ON resellers;
DROP POLICY IF EXISTS "Enable all for reseller_orders" ON reseller_orders;
DROP POLICY IF EXISTS "Enable all for transfer_orders" ON transfer_orders;
DROP POLICY IF EXISTS "Enable all for kikiks_locations" ON kikiks_locations;
DROP POLICY IF EXISTS "Enable all for location_srps" ON location_srps;
DROP POLICY IF EXISTS "Enable all for app_settings" ON app_settings;

-- Now create new policies with explicit SELECT permission for anonymous users
-- This allows public read access which is needed for your public order form

-- INVENTORY TABLE
CREATE POLICY "Allow public read access for inventory" 
ON inventory FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations for inventory" 
ON inventory FOR ALL 
USING (true) 
WITH CHECK (true);

-- RESELLERS TABLE
CREATE POLICY "Allow public read access for resellers" 
ON resellers FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations for resellers" 
ON resellers FOR ALL 
USING (true) 
WITH CHECK (true);

-- RESELLER ORDERS TABLE
CREATE POLICY "Allow public insert for reseller_orders" 
ON reseller_orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all operations for reseller_orders" 
ON reseller_orders FOR ALL 
USING (true) 
WITH CHECK (true);

-- TRANSFER ORDERS TABLE
CREATE POLICY "Allow all operations for transfer_orders" 
ON transfer_orders FOR ALL 
USING (true) 
WITH CHECK (true);

-- KIKIKS LOCATIONS TABLE
CREATE POLICY "Allow public read access for kikiks_locations" 
ON kikiks_locations FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations for kikiks_locations" 
ON kikiks_locations FOR ALL 
USING (true) 
WITH CHECK (true);

-- LOCATION SRPS TABLE
CREATE POLICY "Allow public read access for location_srps" 
ON location_srps FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations for location_srps" 
ON location_srps FOR ALL 
USING (true) 
WITH CHECK (true);

-- APP SETTINGS TABLE
CREATE POLICY "Allow public read access for app_settings" 
ON app_settings FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations for app_settings" 
ON app_settings FOR ALL 
USING (true) 
WITH CHECK (true);

-- ========================================
-- VERIFY POLICIES ARE ENABLED
-- ========================================
-- You can run this query to verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
