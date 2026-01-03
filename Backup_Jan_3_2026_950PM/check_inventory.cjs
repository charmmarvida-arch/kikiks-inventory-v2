
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking for Cake items in Supabase...");
    const { data, error } = await supabase
        .from('inventory')
        .select('sku, description')
        .ilike('sku', 'Cake%');

    if (error) {
        console.error("Error fetching inventory:", error);
    } else {
        if (data.length === 0) {
            console.log("NO Cake items found in Cloud Database.");
        } else {
            console.log(`Found ${data.length} Cake items in Cloud Database:`);
            console.table(data);
        }
    }
}

check();
