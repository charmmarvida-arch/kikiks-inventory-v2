
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugToFile() {
    const { data, error } = await supabase
        .from('resellers')
        .select('id, name')
        .ilike('name', '%James%');

    let output = "RESELLERS:\n";
    if (data) {
        data.forEach(r => output += `ID: ${r.id} | Name: "${r.name}"\n`);
    } else {
        output += "Error: " + JSON.stringify(error) + "\n";
    }

    const { data: orders } = await supabase
        .from('reseller_orders')
        .select('reseller_name, reseller_id')
        .ilike('reseller_name', '%James%');

    output += "\nORDERS:\n";
    if (orders) {
        // Unique combo of ID and Name
        const unique = {};
        orders.forEach(o => {
            const key = `${o.reseller_id} | ${o.reseller_name}`;
            unique[key] = (unique[key] || 0) + 1;
        });
        Object.entries(unique).forEach(([k, count]) => {
            output += `${k} (Count: ${count})\n`;
        });
    }

    fs.writeFileSync('james_debug_output.txt', output);
    console.log("Wrote to james_debug_output.txt");
}

debugToFile();
