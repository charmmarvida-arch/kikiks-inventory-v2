
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmefvdaotljcswtvtjpr.supabase.co';
const supabaseKey = 'sb_publishable_Fqz7kjSDzzW9cXAh8V8dTQ_17AblreX';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const { data: orders, error } = await supabase
        .from('reseller_orders')
        .select('*')
        .eq('reseller_name', 'Private Individual')
        .eq('total_amount', 41425);

    if (orders && orders.length > 0) {
        console.log("Record STILL EXISTS.");
        orders.forEach(o => {
            console.log(`ID: ${o.id}, Date: ${o.date}`);
        });
    } else {
        console.log("Record NOT found (Deletion Verified).");
    }
}

verify();
