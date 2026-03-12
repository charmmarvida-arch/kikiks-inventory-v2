import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Superbase URL or Key in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Adding Namito branches to kikiks_locations...");

    const newLocations = [
        { name: 'Namito SM Daet' },
        { name: 'Namito SM Naga' }
    ];

    const { data, error } = await supabase
        .from('kikiks_locations')
        .insert(newLocations)
        .select();

    if (error) {
        console.error("Error inserting locations:", error);
    } else {
        console.log("Successfully inserted locations:", data);
    }
}

run();
