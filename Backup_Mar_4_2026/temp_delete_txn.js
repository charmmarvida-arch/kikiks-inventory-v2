
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmefvdaotljcswtvtjpr.supabase.co';
const supabaseKey = 'sb_publishable_Fqz7kjSDzzW9cXAh8V8dTQ_17AblreX';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTransaction() {
    console.log("Searching for transaction...");
    const { data: orders, error: findError } = await supabase
        .from('reseller_orders')
        .select('*')
        .eq('reseller_name', 'Private Individual')
        .eq('total_amount', 41425);

    if (findError) {
        console.error('Error finding order:', findError);
        return;
    }

    if (!orders || orders.length === 0) {
        console.log('No matching order found.');
        return;
    }

    console.log(`Found ${orders.length} order(s).`);

    for (const order of orders) {
        console.log(`ID: ${order.id}, Date: ${order.date}, Amount: ${order.total_amount}`);

        // Safety check: verify date matches roughly (Dec 2025)
        if (order.date && order.date.includes('2025-12')) {
            console.log(`Attempting to delete order ${order.id}...`);
            const { error: deleteError } = await supabase
                .from('reseller_orders')
                .delete()
                .eq('id', order.id);

            if (deleteError) {
                console.error(`Failed to delete: ${deleteError.message}`);
            } else {
                console.log(`Successfully deleted order ${order.id}`);
            }
        } else {
            console.log(`Skipping order ${order.id} due to date mismatch: ${order.date}`);
        }
    }
}

deleteTransaction();
