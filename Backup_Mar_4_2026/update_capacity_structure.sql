-- ============================================
-- UPDATE: Change Capacity System from Per-SKU to Per-Size
-- ============================================

-- Drop the old table
DROP TABLE IF EXISTS branch_capacity_settings CASCADE;

-- Create new capacity table with size-category based structure
CREATE TABLE branch_capacity_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_location TEXT NOT NULL,
    size_category TEXT NOT NULL, -- 'Cups', 'Pints', 'Liters', 'Gallons', 'Trays'
    max_capacity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    ideal_stock_level INTEGER DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One capacity setting per branch per size category
    UNIQUE(branch_location, size_category)
);

-- Add RLS policies
ALTER TABLE branch_capacity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON branch_capacity_settings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON branch_capacity_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON branch_capacity_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON branch_capacity_settings
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default capacity settings for all branches
INSERT INTO branch_capacity_settings (branch_location, size_category, max_capacity, min_stock_level, ideal_stock_level, notes) VALUES
-- SM Sorsogon
('SM Sorsogon', 'Cups', 200, 20, 100, 'Total capacity for all cup flavors'),
('SM Sorsogon', 'Pints', 40, 10, 25, 'Total capacity for all pint flavors'),
('SM Sorsogon', 'Liters', 30, 5, 15, 'Total capacity for all liter flavors'),
('SM Sorsogon', 'Gallons', 10, 2, 5, 'Total capacity for all gallon flavors'),
('SM Sorsogon', 'Trays', 20, 5, 10, 'Total capacity for all tray flavors'),

-- SM Legazpi
('SM Legazpi', 'Cups', 200, 20, 100, 'Total capacity for all cup flavors'),
('SM Legazpi', 'Pints', 40, 10, 25, 'Total capacity for all pint flavors'),
('SM Legazpi', 'Liters', 30, 5, 15, 'Total capacity for all liter flavors'),
('SM Legazpi', 'Gallons', 10, 2, 5, 'Total capacity for all gallon flavors'),
('SM Legazpi', 'Trays', 20, 5, 10, 'Total capacity for all tray flavors'),

-- Ayala Legazpi
('Ayala Legazpi', 'Cups', 200, 20, 100, 'Total capacity for all cup flavors'),
('Ayala Legazpi', 'Pints', 40, 10, 25, 'Total capacity for all pint flavors'),
('Ayala Legazpi', 'Liters', 30, 5, 15, 'Total capacity for all liter flavors'),
('Ayala Legazpi', 'Gallons', 10, 2, 5, 'Total capacity for all gallon flavors'),
('Ayala Legazpi', 'Trays', 20, 5, 10, 'Total capacity for all tray flavors');

-- Verify
SELECT * FROM branch_capacity_settings ORDER BY branch_location, size_category;
