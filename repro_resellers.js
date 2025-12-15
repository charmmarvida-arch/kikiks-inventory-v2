import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error("Error reading .env:", e.message);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Starting fetch...");
    const start = Date.now();

    const { data, error } = await supabase
        .from('resellers')
        .select('id, name, zone_id, is_active, location')
        .order('name');

    const end = Date.now();
    console.log(`Fetch took ${end - start}ms`);

    if (error) {
        console.error("Error fetching resellers:", error);
    } else {
        console.log(`Fetched ${data.length} resellers.`);
        if (data.length > 0) {
            console.log("First reseller:", data[0]);
        } else {
            console.log("No resellers found. RLS issue?");
        }
    }
}

testFetch();
