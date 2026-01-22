
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixStJames() {
    const targetId = 'a714a235-ba34-4659-b653-f4c2fecf8572';
    const correctName = 'St. James Water Refilling Station';

    console.log(`Fixing Reseller ID: ${targetId}`);
    console.log(`Setting Name to: "${correctName}"`);

    // 1. Update Reseller Table Name
    const { error: rError } = await supabase
        .from('resellers')
        .update({ name: correctName })
        .eq('id', targetId);

    if (rError) console.error("Error updating resellers table:", rError);
    else console.log("Updated resellers table name.");

    // 2. Update All Orders for this ID to have the correct name
    const { error: oError, count } = await supabase
        .from('reseller_orders')
        .update({ reseller_name: correctName })
        .eq('reseller_id', targetId)
        .select('id', { count: 'exact' });

    if (oError) console.error("Error updating orders:", oError);
    else console.log(`Updated ${count} orders to use the correct name.`);
}

fixStJames();
