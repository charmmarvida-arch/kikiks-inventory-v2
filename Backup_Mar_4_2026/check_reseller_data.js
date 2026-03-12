
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return {};
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("=== DATA CHECK SUMMARY ===");

    // Check Resellers
    const { data: resellers, error: rError } = await supabase.from('resellers').select('*');
    if (rError) console.error("Error fetching resellers:", rError.message);
    else console.log(`[SUMMARY] Resellers Count: ${resellers.length}`);

    // Check Reseller Orders
    const { data: orders, error: oError } = await supabase
        .from('reseller_orders')
        .select('id, date, status, location, total_amount, is_encoded')
        .order('date', { ascending: false })
        .limit(10);

    if (oError) {
        console.error("Error fetching orders:", oError.message);
    } else {
        console.log(`[SUMMARY] Recent Orders (Top 10):`);
        orders.forEach(o => {
            console.log(` - Date: ${o.date}, Status: ${o.status}, Amount: ${o.total_amount}, Encoded: ${o.is_encoded}`);
        });
    }

    // Check Settings
    const { data: settings, error: sError } = await supabase.from('reseller_settings').select('*');
    if (sError) console.error("Error settings:", sError.message);
    else console.log(`[SUMMARY] Settings Count: ${settings.length}`);
}

checkData();
