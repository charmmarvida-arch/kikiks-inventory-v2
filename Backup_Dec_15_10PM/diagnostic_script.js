// DIAGNOSTIC SCRIPT - Copy and paste this into your browser console (F12)
// Run this AFTER trying to create a transfer order

(async function diagnoseTransferIssue() {
    console.log('🔍 DIAGNOSTIC: Starting transfer_orders investigation...\n');

    // 1. Check if we can connect to Supabase
    console.log('1️⃣ Testing Supabase connection...');
    const supabase = window.supabase || (await import('./supabaseClient')).supabase;

    if (!supabase) {
        console.error('❌ Supabase client not found!');
        return;
    }
    console.log('✅ Supabase client exists\n');

    // 2. Try to fetch transfer_orders
    console.log('2️⃣ Fetching transfer_orders from database...');
    const { data, error } = await supabase
        .from('transfer_orders')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('❌ Error fetching transfer_orders:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
        console.log(`✅ Successfully fetched ${data?.length || 0} transfer orders`);
        console.table(data);
    }

    // 3. Try to insert a test order
    console.log('\n3️⃣ Testing INSERT operation...');
    const testOrder = {
        id: 'TEST-' + Date.now(),
        from_location: 'FTF Manufacturing',
        destination: 'SM Sorsogon',
        items: { 'FGC-001': 10 },
        total_amount: 250,
        date: new Date().toISOString(),
        status: 'Unread',
        is_deducted: true
    };

    console.log('Test order to insert:', testOrder);

    const { data: insertData, error: insertError } = await supabase
        .from('transfer_orders')
        .insert(testOrder)
        .select();

    if (insertError) {
        console.error('❌ INSERT FAILED:', insertError);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
        console.log('✅ INSERT SUCCESSFUL!');
        console.log('Inserted data:', insertData);

        // Clean up - delete the test order
        await supabase.from('transfer_orders').delete().eq('id', testOrder.id);
        console.log('🧹 Test order cleaned up');
    }

    console.log('\n📊 DIAGNOSTIC COMPLETE');
})();
