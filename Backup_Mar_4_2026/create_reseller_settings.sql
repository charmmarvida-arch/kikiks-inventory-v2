-- Create reseller_settings table to store minimum monthly order requirements
CREATE TABLE IF NOT EXISTS reseller_settings (
    id SERIAL PRIMARY KEY,
    reseller_name TEXT NOT NULL UNIQUE,
    minimum_monthly_order NUMERIC(10, 2) DEFAULT 10000.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on reseller_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_reseller_settings_name ON reseller_settings(reseller_name);

-- Add comments for documentation
COMMENT ON TABLE reseller_settings IS 'Stores minimum monthly order requirements for each reseller';
COMMENT ON COLUMN reseller_settings.reseller_name IS 'Name of the reseller (must match reseller_orders.reseller_name)';
COMMENT ON COLUMN reseller_settings.minimum_monthly_order IS 'Minimum order amount required per month in PHP (₱)';
COMMENT ON COLUMN reseller_settings.created_at IS 'Timestamp when the setting was first created';
COMMENT ON COLUMN reseller_settings.updated_at IS 'Timestamp when the setting was last updated';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reseller_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_reseller_settings_updated_at ON reseller_settings;
CREATE TRIGGER trigger_update_reseller_settings_updated_at
    BEFORE UPDATE ON reseller_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_reseller_settings_updated_at();
