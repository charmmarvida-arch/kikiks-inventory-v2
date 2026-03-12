
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listJames() {
    const { data, error } = await supabase
        .from('resellers')
        .select('id, name')
        .ilike('name', '%James%');

    if (error) console.error(error);
    else {
        console.log("RESELLERS FOUND:");
        data.forEach(r => console.log(`ID: ${r.id} | Name: '${r.name}'`));
    }

    const { data: orderData, error: orderError } = await supabase
        .from('reseller_orders')
        .select('reseller_name')
        .ilike('reseller_name', '%James%');

    if (orderError) console.error(orderError);
    else {
        const names = [...new Set(orderData.map(o => o.reseller_name))];
        console.log("\nORDER NAMES FOUND:");
        names.forEach(n => console.log(`'${n}'`));
    }
}

listJames();
