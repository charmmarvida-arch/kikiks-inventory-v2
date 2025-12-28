
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim(); // Handle values with =
            env[key] = value;
        }
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function check() {
        console.log("Checking for Cake items in Cloud Inventory...");
        const { data, error } = await supabase
            .from('inventory')
            .select('sku, description')
            .ilike('sku', 'Cake%');

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log(`Found ${data.length} items starting with 'Cake':`);
            console.table(data);
        }
    }

    check();

} catch (err) {
    console.error("Script failed:", err);
}
