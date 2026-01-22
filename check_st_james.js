
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkResellers() {
    console.log("Checking for 'St. James' resellers...");

    const { data: orders, error } = await supabase
        .from('reseller_orders')
        .select('reseller_name')
        .ilike('reseller_name', '%James%');

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    const uniqueNames = [...new Set(orders.map(o => o.reseller_name))];
    console.log("\nDistinct Reseller Names found matching 'James':");
    uniqueNames.forEach(name => console.log(`- "${name}"`));

    // Also check the 'resellers' table
    const { data: resellers, error: rError } = await supabase
        .from('resellers')
        .select('name')
        .ilike('name', '%James%');

    if (rError) {
        console.error("Error fetching resellers:", rError);
        return;
    }

    console.log("\nResellers in 'resellers' table matching 'James':");
    resellers.forEach(r => console.log(`- "${r.name}"`));
}

checkResellers();
