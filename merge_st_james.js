
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function mergeResellers() {
    console.log("Starting merge process for 'St. James'...");

    // 1. Get both resellers
    const { data: resellers, error: rError } = await supabase
        .from('resellers')
        .select('*')
        .ilike('name', '%James%');

    if (rError) {
        console.error("Error fetching resellers:", rError);
        return;
    }

    console.log("Found resellers:", resellers);

    const correctReseller = resellers.find(r => r.name.trim() === 'St. James Water Refilling Station');
    const duplicateReseller = resellers.find(r => r.name.includes('...') || (r.name !== 'St. James Water Refilling Station' && r.name.includes('James')));

    if (!correctReseller) {
        console.error("Could not find the correct reseller 'St. James Water Refilling Station'. Aborting.");
        return;
    }

    if (!duplicateReseller) {
        console.log("No duplicate reseller found in 'resellers' table. Checking for orders with wrong name...");
        // If no duplicate user, maybe just orders with wrong text?
        // We will proceed to update orders by text if needed.
    } else {
        console.log(`Identified Duplicate: "${duplicateReseller.name}" (ID: ${duplicateReseller.id})`);
        console.log(`Target Reseller: "${correctReseller.name}" (ID: ${correctReseller.id})`);

        // 2. Update orders belonging to Duplicate ID
        const { data: updateIdResult, error: updateIdError } = await supabase
            .from('reseller_orders')
            .update({
                reseller_id: correctReseller.id,
                reseller_name: correctReseller.name
            })
            .eq('reseller_id', duplicateReseller.id)
            .select();

        if (updateIdError) {
            console.error("Error moving orders from duplicate ID:", updateIdError);
            return;
        }
        console.log(`Moved ${updateIdResult.length} orders from duplicate ID to correct ID.`);

        // 3. Delete the duplicate reseller
        const { error: deleteError } = await supabase
            .from('resellers')
            .delete()
            .eq('id', duplicateReseller.id);

        if (deleteError) {
            console.error("Error deleting duplicate reseller:", deleteError);
        } else {
            console.log("Deleted duplicate reseller entry.");
        }
    }

    // 4. Cleanup any orders that might have the wrong TEXT name but maybe correct ID (or just loose text)
    // We update ANY order with "St. James..." in the name to the correct name and ID.
    const { data: updateTextResult, error: updateTextError } = await supabase
        .from('reseller_orders')
        .update({
            reseller_id: correctReseller.id,
            reseller_name: correctReseller.name
        })
        .ilike('reseller_name', 'St. James...')
        .select();

    if (updateTextError) {
        console.error("Error cleaning up orders by text name:", updateTextError);
    } else {
        console.log(`Fixed ${updateTextResult.length} orders matching text 'St. James...'.`);
    }

    console.log("Merge complete!");
}

mergeResellers();
