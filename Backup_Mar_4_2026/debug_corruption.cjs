const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('Checking for corrupted locations (FGCK)...');
    const { data: items } = await supabase.from('inventory').select('sku, locations').ilike('sku', 'FGCK%').limit(10);

    if (items) {
        items.forEach(i => {
            console.log(`[${i.sku}] Locations type: ${typeof i.locations}`);
            console.log(`Val: ${JSON.stringify(i.locations)}`);
            if (Array.isArray(i.locations)) {
                i.locations.forEach((loc, idx) => {
                    console.log(`  idx ${idx}: type=${typeof loc}, val="${loc}"`);
                });
            }
        });
    }
}
check();
