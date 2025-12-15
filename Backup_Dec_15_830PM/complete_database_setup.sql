-- ========================================
-- COMPLETE DATABASE SETUP FOR KIKIKS INVENTORY
-- ========================================
-- Run this SQL in your Supabase SQL Editor to set up all tables
-- Run it as a single script to create all tables at once

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

-- ========================================
-- 3. RESELLER ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS reseller_orders (
    id TEXT PRIMARY KEY,
    reseller_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2),
    order_date DATE NOT NULL,
    status TEXT DEFAULT 'Pending',
    is_deducted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. TRANSFER ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS transfer_orders (
    id TEXT PRIMARY KEY,
    location_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2),
    order_date DATE NOT NULL,
    status TEXT DEFAULT 'Pending',
    is_deducted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ========================================
-- 7. APP SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default app settings
INSERT INTO app_settings (key, value)
VALUES 
    ('coa_sequence', '104'::jsonb),
    ('min_order_thresholds', '{
        "Sorsogon City": 2000,
        "Within Sorsogon City (Juban, Matnog, Bulusan)": 3000,
        "Legazpi City": 5000,
        "Naga": 0,
        "Daet": 0,
        "Special Arrangement": 0
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kikiks_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_srps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE POLICIES (Allow all for internal app)
-- ========================================
-- For simplicity in an internal app, we allow all operations
-- You can refine these later with authentication

CREATE POLICY "Enable all for inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for resellers" ON resellers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for reseller_orders" ON reseller_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for transfer_orders" ON transfer_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for kikiks_locations" ON kikiks_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for location_srps" ON location_srps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_reseller_orders_date ON reseller_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_date ON transfer_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_reseller_orders_status ON reseller_orders(status);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_status ON transfer_orders(status);
CREATE INDEX IF NOT EXISTS idx_location_srps_location ON location_srps(location_name);

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Your database is now ready for the Kikiks Inventory application
