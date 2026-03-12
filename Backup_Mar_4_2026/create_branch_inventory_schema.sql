-- ============================================
-- Branch Inventory Management System
-- Database Schema v1.0
-- Created: Jan 3, 2026
-- ============================================

-- Table 1: Branch Inventory (Current Stock Levels)
-- Stores current stock at each Kikiks branch
CREATE TABLE IF NOT EXISTS branch_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_location TEXT NOT NULL,
    sku TEXT NOT NULL,
    product_description TEXT,
    category TEXT, -- e.g., 'Cups', 'Pints', 'Liters'
    current_stock INTEGER DEFAULT 0,
    last_sync_date TIMESTAMPTZ,
    last_sync_source TEXT, -- 'utak_import', 'manual', 'transfer_received'
    sync_metadata JSONB, -- Store raw Utak data for reference
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_location, sku)
);

-- Table 2: Branch Inventory History (Audit Trail)
-- Tracks all changes to branch inventory
CREATE TABLE IF NOT EXISTS branch_inventory_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_location TEXT NOT NULL,
    sku TEXT NOT NULL,
    product_description TEXT,
    change_type TEXT NOT NULL, -- 'utak_import', 'manual_adjustment', 'transfer_in', 'transfer_out', 'sale'
    quantity_before INTEGER,
    quantity_change INTEGER, -- Positive for additions, negative for deductions
    quantity_after INTEGER,
    source_data JSONB, -- Additional context (e.g., transfer order ID, import file name)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Table 3: Branch Capacity Settings (Configuration)
-- Define maximum capacity per branch per product
CREATE TABLE IF NOT EXISTS branch_capacity_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_location TEXT NOT NULL,
    sku TEXT NOT NULL,
    max_capacity INTEGER NOT NULL,
    min_stock_level INTEGER DEFAULT 0, -- Reorder point
    ideal_stock_level INTEGER, -- Target stock
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_location, sku)
);

-- Table 4: Utak Import Log (Track Import History)
-- Keep track of CSV imports
CREATE TABLE IF NOT EXISTS branch_utak_import_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_location TEXT NOT NULL,
    import_date TIMESTAMPTZ DEFAULT NOW(),
    file_name TEXT,
    products_imported INTEGER,
    products_matched INTEGER,
    products_unmatched INTEGER,
    import_status TEXT, -- 'success', 'partial', 'failed'
    error_log JSONB,
    imported_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_branch_inventory_location ON branch_inventory(branch_location);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_sku ON branch_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_location_sku ON branch_inventory(branch_location, sku);
CREATE INDEX IF NOT EXISTS idx_branch_history_location ON branch_inventory_history(branch_location);
CREATE INDEX IF NOT EXISTS idx_branch_history_sku ON branch_inventory_history(sku);
CREATE INDEX IF NOT EXISTS idx_branch_history_created ON branch_inventory_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_capacity_location ON branch_capacity_settings(branch_location);

-- Function: Update timestamp on modification
CREATE OR REPLACE FUNCTION update_branch_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update timestamp
DROP TRIGGER IF EXISTS trigger_branch_inventory_timestamp ON branch_inventory;
CREATE TRIGGER trigger_branch_inventory_timestamp
    BEFORE UPDATE ON branch_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_branch_inventory_timestamp();

DROP TRIGGER IF EXISTS trigger_branch_capacity_timestamp ON branch_capacity_settings;
CREATE TRIGGER trigger_branch_capacity_timestamp
    BEFORE UPDATE ON branch_capacity_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_branch_inventory_timestamp();

-- RLS (Row Level Security) Policies
-- Enable RLS on all tables
ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_capacity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_utak_import_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users full access
-- (Since this is internal system, authenticated users can access all branch data)
CREATE POLICY branch_inventory_policy ON branch_inventory
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY branch_history_policy ON branch_inventory_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY branch_capacity_policy ON branch_capacity_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY branch_import_log_policy ON branch_utak_import_log
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Helper Function: Get current stock for a branch + SKU
CREATE OR REPLACE FUNCTION get_branch_stock(p_branch TEXT, p_sku TEXT)
RETURNS INTEGER AS $$
DECLARE
    stock INTEGER;
BEGIN
    SELECT current_stock INTO stock
    FROM branch_inventory
    WHERE branch_location = p_branch AND sku = p_sku;
    
    RETURN COALESCE(stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Helper Function: Get all low-stock items for a branch
CREATE OR REPLACE FUNCTION get_low_stock_items(p_branch TEXT)
RETURNS TABLE (
    sku TEXT,
    product_description TEXT,
    current_stock INTEGER,
    min_stock_level INTEGER,
    shortage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bi.sku,
        bi.product_description,
        bi.current_stock,
        bcs.min_stock_level,
        (bcs.min_stock_level - bi.current_stock) AS shortage
    FROM branch_inventory bi
    INNER JOIN branch_capacity_settings bcs 
        ON bi.branch_location = bcs.branch_location 
        AND bi.sku = bcs.sku
    WHERE bi.branch_location = p_branch
        AND bi.current_stock < bcs.min_stock_level
    ORDER BY (bcs.min_stock_level - bi.current_stock) DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample Data for Testing (Optional - Comment out if not needed)
-- INSERT INTO branch_capacity_settings (branch_location, sku, max_capacity, min_stock_level, ideal_stock_level, notes)
-- VALUES 
--     ('SM Sorsogon', 'FGC-001', 200, 50, 150, 'Cafe Mocha Cup'),
--     ('SM Sorsogon', 'FGC-002', 200, 50, 150, 'Mango Peach Pie Crust Cup'),
--     ('SM Sorsogon', 'FGP-001', 100, 20, 80, 'Cafe Mocha Pint'),
--     ('SM Legazpi', 'FGC-001', 150, 30, 100, 'Cafe Mocha Cup'),
--     ('Ayala Legazpi', 'FGC-001', 180, 40, 120, 'Cafe Mocha Cup');

COMMENT ON TABLE branch_inventory IS 'Stores current stock levels at each Kikiks branch, synced from Utak exports';
COMMENT ON TABLE branch_inventory_history IS 'Audit trail of all branch inventory changes';
COMMENT ON TABLE branch_capacity_settings IS 'Configuration for max capacity and reorder points per branch';
COMMENT ON TABLE branch_utak_import_log IS 'Log of all Utak CSV imports for tracking and debugging';
