-- ========================================
-- FTF MANUFACTURING ENHANCEMENT SCHEMA
-- ========================================
-- Run this SQL in your Supabase SQL Editor
-- This adds tables for the enhanced FTF Manufacturing features

-- ========================================
-- 1. ADJUSTMENT REASONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ftf_adjustment_reasons (
  id SERIAL PRIMARY KEY,
  reason_text VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default reasons
INSERT INTO ftf_adjustment_reasons (reason_text, display_order) VALUES
('Reject', 1),
('Return/Bad Order', 2),
('Wrong Counting', 3)
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. STOCK ADJUSTMENTS (AUDIT LOG) TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ftf_stock_adjustments (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  difference INTEGER GENERATED ALWAYS AS (new_quantity - old_quantity) STORED,
  reason_id INTEGER REFERENCES ftf_adjustment_reasons(id),
  notes TEXT,
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 3. PRODUCTION TRACKING TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ftf_production_tracking (
  sku VARCHAR(50) PRIMARY KEY,
  last_production_date DATE,
  last_stockin_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 4. LOW STOCK THRESHOLDS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ftf_low_stock_thresholds (
  sku VARCHAR(50) PRIMARY KEY,
  minimum_threshold INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 5. COST OF GOODS PRICES (in app_settings)
-- ========================================
-- Will use key 'ftf_cogs_prices' with JSONB value
INSERT INTO app_settings (key, value)
VALUES ('ftf_cogs_prices', '{"FGC": 0, "FGP": 0, "FGL": 0, "FGG": 0, "FGT": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE ftf_adjustment_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ftf_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ftf_production_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ftf_low_stock_thresholds ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE POLICIES
-- ========================================
CREATE POLICY "Allow all for authenticated users" ON ftf_adjustment_reasons FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON ftf_stock_adjustments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON ftf_production_tracking FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON ftf_low_stock_thresholds FOR ALL TO authenticated USING (true);

-- Also allow for public (for internal app consistency)
CREATE POLICY "Enable all for ftf_adjustment_reasons" ON ftf_adjustment_reasons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for ftf_stock_adjustments" ON ftf_stock_adjustments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for ftf_production_tracking" ON ftf_production_tracking FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for ftf_low_stock_thresholds" ON ftf_low_stock_thresholds FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_sku ON ftf_stock_adjustments(sku);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON ftf_stock_adjustments(adjusted_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_tracking_date ON ftf_production_tracking(last_production_date DESC);

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- FTF Manufacturing enhancement tables are now ready
