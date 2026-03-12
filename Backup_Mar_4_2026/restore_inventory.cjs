const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
} catch (e) {
    console.error("Error loading .env:", e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Missing items to restore
const MISSING_ITEMS = [
    // Cups (FGC)
    { sku: 'FGC-001', description: 'Cafe Mocha Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-002', description: 'Mango Peach Pie Crust Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-003', description: 'Milky Chocolate Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-004', description: 'Suman at Mangga Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-005', description: 'Vanilla Langka Cup', uom: 'PCS', quantity: 0 },

    // Pints (FGP)
    { sku: 'FGP-001', description: 'Cafe Mocha Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-002', description: 'Mango Peach Pie Crust Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-003', description: 'Milky Chocolate Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-004', description: 'Suman at Mangga Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-005', description: 'Vanilla Langka Pint', uom: 'PCS', quantity: 0 },

    // Liters (FGL)
    { sku: 'FGL-001', description: 'Cafe Mocha Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-002', description: 'Mango Peach Pie Crust Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-003', description: 'Milky Chocolate Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-004', description: 'Suman at Mangga Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-005', description: 'Vanilla Langka Liter', uom: 'PCS', quantity: 0 },

    // Gallons (FGG)
    { sku: 'FGG-001', description: 'Cafe Mocha Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-002', description: 'Mango Peach Pie Crust Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-003', description: 'Milky Chocolate Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-004', description: 'Suman at Mangga Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-005', description: 'Vanilla Langka Gallon', uom: 'PCS', quantity: 0 },
];

async function restoreInventory() {
    console.log('🔄 Starting inventory restoration...');
    console.log(`📦 Attempting to restore ${MISSING_ITEMS.length} items\n`);

    try {
        // Insert all missing items
        const { data, error } = await supabase
            .from('inventory')
            .insert(MISSING_ITEMS)
            .select();

        if (error) {
            console.error('❌ Error inserting items:', error);
            return;
        }

        console.log(`✅ Successfully restored ${data.length} items!`);
        console.log('\n📋 Restored items:');
        data.forEach(item => {
            console.log(`  - ${item.sku}: ${item.description}`);
        });

        console.log('\n🎉 Restoration complete! Refresh your app to see the items.');
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

restoreInventory();
