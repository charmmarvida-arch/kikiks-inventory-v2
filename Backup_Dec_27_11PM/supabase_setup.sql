-- Create the app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Insert default values if they don't exist
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

-- Enable Row Level Security (RLS)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to read/write (since we are using anon key for now and it's an internal app)
-- Ideally, you should restrict write access, but for this migration step, we'll allow it.
-- You can refine this later to only allow authenticated users if you implement auth.
CREATE POLICY "Enable read/write for all users" ON app_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
