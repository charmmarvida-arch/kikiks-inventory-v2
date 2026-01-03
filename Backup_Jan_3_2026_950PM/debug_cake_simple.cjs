
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });

    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

    async function check() {
        console.log("Checking table structure...");
        // Select * limit 1 to see columns
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .limit(1);

        if (error) console.error(error);
        else {
            if (data.length > 0) {
                console.log("Columns:", Object.keys(data[0]));
            } else {
                console.log("Table empty, cannot infer columns from data.");
            }
        }
    }
    check();
} catch (err) { console.error(err); }
