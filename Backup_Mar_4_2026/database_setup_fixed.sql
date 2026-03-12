-- ========================================
-- COMPLETE DATABASE SETUP FOR KIKIKS INVENTORY (FIXED)
-- ========================================
-- This version safely handles existing tables from previous setup
-- Run this SQL in your Supabase SQL Editor

-- ========================================
-- 1. INVENTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    uom TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists and create new one
DROP POLICY IF EXISTS "Enable all for inventory" ON inventory;
CREATE POLICY "Enable all for inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 2. RESELLERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS resellers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for resellers" ON resellers;
CREATE POLICY "Enable all for resellers" ON resellers FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 3. RESELLER ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS reseller_orders (
    id TEXT PRIMARY KEY,
    reseller_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2),
    date DATE NOT NULL,
    status TEXT DEFAULT 'Pending',
    is_deducted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reseller_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for reseller_orders" ON reseller_orders;
CREATE POLICY "Enable all for reseller_orders" ON reseller_orders FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 4. TRANSFER ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS transfer_orders (
    id TEXT PRIMARY KEY,
    location_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2),
    date DATE NOT NULL,
    status TEXT DEFAULT 'Pending',
    is_deducted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for transfer_orders" ON transfer_orders;
CREATE POLICY "Enable all for transfer_orders" ON transfer_orders FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 5. KIKIKS LOCATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS kikiks_locations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default locations
INSERT INTO kikiks_locations (name)
VALUES 
    ('Roro Commissary'),
    ('SM Sorsogon'),
    ('SM Legazpi'),
    ('SM Daet'),
    ('Legazpi Storage')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE kikiks_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for kikiks_locations" ON kikiks_locations;
CREATE POLICY "Enable all for kikiks_locations" ON kikiks_locations FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 6. LOCATION SRPS (Price List) TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS location_srps (
    id SERIAL PRIMARY KEY,
    location_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_name, sku)
);

ALTER TABLE location_srps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for location_srps" ON location_srps;
CREATE POLICY "Enable all for location_srps" ON location_srps FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 7. APP SETTINGS TABLE (Already exists from yesterday)
-- ========================================
-- This was already created, so we just ensure the policy exists
DROP POLICY IF EXISTS "Enable all for app_settings" ON app_settings;
CREATE POLICY "Enable all for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
-- Use 'date' column instead of 'order_date'
DROP INDEX IF EXISTS idx_reseller_orders_date;
CREATE INDEX idx_reseller_orders_date ON reseller_orders(date DESC);

DROP INDEX IF EXISTS idx_transfer_orders_date;
CREATE INDEX idx_transfer_orders_date ON transfer_orders(date DESC);

DROP INDEX IF EXISTS idx_reseller_orders_status;
CREATE INDEX idx_reseller_orders_status ON reseller_orders(status);

DROP INDEX IF EXISTS idx_transfer_orders_status;
CREATE INDEX idx_transfer_orders_status ON transfer_orders(status);

DROP INDEX IF EXISTS idx_location_srps_location;
CREATE INDEX idx_location_srps_location ON location_srps(location_name);

-- ========================================
-- SETUP COMPLETE!
-- ========================================
