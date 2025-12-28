const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Manually parse .env because dotenv flow might be tricky in this environment
try {
    const envPath = path.resolve(__dirname, '.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.error("Error loading .env:", e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventory() {
    console.log('Testing select(*) from inventory...');

    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error fetching inventory:', error);
    } else {
        console.log('✅ Success! Found items:', data.length);
        if (data.length > 0) {
            console.log('Sample item keys:', Object.keys(data[0]));
        }
    }
}

checkInventory();
