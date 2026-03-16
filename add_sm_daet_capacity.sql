-- ============================================
-- SQL Migration: Add Default Capacity for SM Daet
-- Created: 2026-03-15
-- ============================================

-- Insert default capacity settings for SM Daet
-- Using the same defaults as other branches
INSERT INTO branch_capacity_settings (branch_location, size_category, max_capacity, min_stock_level, ideal_stock_level, notes)
VALUES
('SM Daet', 'Cups', 200, 20, 100, 'Total capacity for all cup flavors'),
('SM Daet', 'Pints', 40, 10, 25, 'Total capacity for all pint flavors'),
('SM Daet', 'Liters', 30, 5, 15, 'Total capacity for all liter flavors'),
('SM Daet', 'Gallons', 10, 2, 5, 'Total capacity for all gallon flavors'),
('SM Daet', 'Trays', 20, 5, 10, 'Total capacity for all tray flavors')
ON CONFLICT (branch_location, size_category) DO NOTHING;

-- Log the change (if there's an audit table for settings changes, but we'll stick to this for now)
SELECT * FROM branch_capacity_settings WHERE branch_location = 'SM Daet' ORDER BY size_category;
