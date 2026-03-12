import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

const executeSql = async () => {
    const sql = `
  CREATE TABLE IF NOT EXISTS daet_storage_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    flavor VARCHAR(255),
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Copy all products from inventory to daet_storage_inventory with 0 quantity
  INSERT INTO daet_storage_inventory (sku, product_name, flavor, quantity, unit)
  SELECT 
    sku,
    description as product_name, 
    NULL as flavor,                
    0 as quantity,                 
    uom as unit                    
  FROM inventory
  ON CONFLICT DO NOTHING;

  -- Enable Row Level Security (RLS)
  ALTER TABLE daet_storage_inventory ENABLE ROW LEVEL SECURITY;

  -- Create policy for authenticated users
  DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON daet_storage_inventory;
  CREATE POLICY "Enable all operations for authenticated users" 
  ON daet_storage_inventory
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

  -- Grant permissions
  GRANT ALL ON daet_storage_inventory TO authenticated;
  GRANT ALL ON daet_storage_inventory TO service_role;
  `;

    // We can't run raw SQL from the client sdk usually without pg library or a rpc function
    // We'll write to console for the user
    console.log("SQL TO RUN:", sql);
};

executeSql();
