
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function mergeResellersData() {
    // 1. Fetch to get IDs again to be absolutely sure
    const { data: allResellers, error } = await supabase
        .from('resellers')
        .select('id, name')
        .ilike('name', '%James%');

    if (error) return console.error(error);

    // Identify Correct vs URL
    const correctInfo = allResellers.find(r => r.name.includes('Water Refilling Station'));
    const badInfos = allResellers.filter(r => !r.name.includes('Water Refilling Station'));

    if (!correctInfo) {
        console.error("CRITICAL: Correct 'Water Refilling Station' entry not found.");
        return;
    }

    console.log(`Target (Correct): ${correctInfo.name} (${correctInfo.id})`);

    // 2. Loop through bad ones
    for (const bad of badInfos) {
        console.log(`Merging ${bad.name} (${bad.id})...`);

        // Move Orders
        const { error: moveError } = await supabase
            .from('reseller_orders')
            .update({
                reseller_id: correctInfo.id,
                reseller_name: correctInfo.name
            })
            .eq('reseller_id', bad.id);

        if (moveError) console.error(`Error moving orders for ${bad.name}:`, moveError);
        else console.log(`Orders moved for ${bad.name}`);

        // Delete Bad Reseller
        const { error: delError } = await supabase
            .from('resellers')
            .delete()
            .eq('id', bad.id);

        if (delError) console.error(`Error deleting ${bad.name}:`, delError);
        else console.log(`Deleted reseller record: ${bad.name}`);
    }

    // 3. Fix Loose Text Orders (Text-based cleanup)
    console.log("Cleaning up orders with name 'St. James...' by text matching...");
    const { error: textError } = await supabase
        .from('reseller_orders')
        .update({
            reseller_id: correctInfo.id,
            reseller_name: correctInfo.name
        })
        .ilike('reseller_name', 'St. James...');

    if (textError) console.error("Text cleanup error:", textError);
    else console.log("Text cleanup complete.");

    console.log("Merge Done.");
}

mergeResellersData();
