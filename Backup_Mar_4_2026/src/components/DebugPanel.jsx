import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const DebugPanel = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const addLog = (message, type = 'info') => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${type.toUpperCase()}: ${message}`, ...prev]);
    };

    const checkConnection = async () => {
        setLoading(true);
        addLog('Checking Supabase connection...', 'info');
        try {
            const { data, error } = await supabase.from('reseller_orders').select('count', { count: 'exact', head: true });
            if (error) throw error;
            addLog(`Connection Successful! Table 'reseller_orders' exists.`, 'success');
        } catch (error) {
            addLog(`Connection Failed: ${error.message}`, 'error');
            if (error.message.includes('relation "reseller_orders" does not exist')) {
                addLog('CRITICAL: The table "reseller_orders" was not found. Please run the SQL script.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const testInsertOrder = async () => {
        setLoading(true);
        addLog('Testing Order Insertion...', 'info');
        const testId = `TEST-${Date.now()}`;
        const testOrder = {
            id: testId,
            reseller_name: 'DEBUG_TEST_USER',
            location: 'DEBUG_LOCATION',
            address: '123 Debug St',
            items: { 'FGC-001': 1 },
            total_amount: 100,
            date: new Date().toISOString(),
            status: 'Unread',
            is_deducted: false,
            // New columns
            has_packing_list: false,
            has_coa: false,
            coa_data: {}
        };

        try {
            const { error } = await supabase.from('reseller_orders').insert(testOrder);
            if (error) throw error;
            addLog(`Insert Successful! Created order ID: ${testId}`, 'success');
            return testId;
        } catch (error) {
            addLog(`Insert Failed: ${error.message}`, 'error');
            addLog(`Details: ${JSON.stringify(error)}`, 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const testUpdateOrder = async () => {
        setLoading(true);
        addLog('Testing Order Update (Simulating "Create" -> "View")...', 'info');

        // First insert a temp order
        const id = await testInsertOrder();
        if (!id) return;

        try {
            const { error } = await supabase.from('reseller_orders')
                .update({ has_packing_list: true })
                .eq('id', id);

            if (error) throw error;
            addLog(`Update Successful! Marked 'has_packing_list' as true for ${id}`, 'success');

            // Clean up
            await supabase.from('reseller_orders').delete().eq('id', id);
            addLog('Cleaned up test order.', 'info');

        } catch (error) {
            addLog(`Update Failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const inspectTableStructure = async () => {
        setLoading(true);
        addLog('Inspecting Table Structure (fetching one row)...', 'info');
        try {
            const { data, error } = await supabase.from('reseller_orders').select('*').limit(1);
            if (error) throw error;

            if (data && data.length > 0) {
                const columns = Object.keys(data[0]);
                addLog(`Found Columns: ${columns.join(', ')}`, 'success');

                const missing = [];
                if (!columns.includes('has_packing_list')) missing.push('has_packing_list');
                if (!columns.includes('has_coa')) missing.push('has_coa');
                if (!columns.includes('coa_data')) missing.push('coa_data');

                if (missing.length > 0) {
                    addLog(`MISSING COLUMNS: ${missing.join(', ')}`, 'error');
                    addLog('Please run the SQL script again!', 'error');
                } else {
                    addLog('All required columns appear to be present.', 'success');
                }
            } else {
                addLog('Table is empty, cannot inspect columns directly. Try inserting a test order.', 'warning');
            }
        } catch (error) {
            addLog(`Inspection Failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                    padding: '10px 20px',
                    backgroundColor: '#ea580c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}
            >
                Open Debug Panel
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            maxHeight: '600px',
            backgroundColor: 'white',
            border: '2px solid #ea580c',
            borderRadius: '8px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            fontFamily: 'monospace'
        }}>
            <div style={{
                padding: '10px',
                backgroundColor: '#ea580c',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 'bold'
            }}>
                <span>System Debugger</span>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}
                >
                    ✕
                </button>
            </div>

            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #eee' }}>
                <button onClick={checkConnection} disabled={loading} style={btnStyle}>1. Check Connection</button>
                <button onClick={testInsertOrder} disabled={loading} style={btnStyle}>2. Test Insert Order</button>
                <button onClick={testUpdateOrder} disabled={loading} style={btnStyle}>3. Test Update (View Button)</button>
                <button onClick={inspectTableStructure} disabled={loading} style={btnStyle}>4. Inspect Columns</button>
                <button onClick={() => setLogs([])} style={{ ...btnStyle, backgroundColor: '#666' }}>Clear Logs</button>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                fontSize: '12px',
                minHeight: '200px'
            }}>
                {logs.length === 0 && <span style={{ color: '#999' }}>Ready to test...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{
                        marginBottom: '4px',
                        color: log.includes('ERROR') || log.includes('Failed') ? 'red' :
                            log.includes('SUCCESS') || log.includes('Successful') ? 'green' : 'black'
                    }}>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};

const btnStyle = {
    padding: '8px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left'
};

export default DebugPanel;
