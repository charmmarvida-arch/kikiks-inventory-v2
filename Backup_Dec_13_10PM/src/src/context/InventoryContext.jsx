import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sendOrderNotification } from '../utils/discordNotifications';

const InventoryContext = createContext();

// Initial data for seeding if DB is empty
const INITIAL_INVENTORY = [
    // Cups (FGC)
    { sku: 'FGC-001', description: 'Cafe Mocha Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-002', description: 'Mango Peach Pie Crust Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-003', description: 'Milky Chocolate Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-004', description: 'Suman at Mangga Cup', uom: 'PCS', quantity: 0 },
    { sku: 'FGC-005', description: 'Vanilla Langka Cup', uom: 'PCS', quantity: 0 },
    // Pints (FGP)
    { sku: 'FGP-001', description: 'Cafe Mocha Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-002', description: 'Mango Peach Pie Crust Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-003', description: 'Milky Chocolate Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-004', description: 'Suman at Mangga Pint', uom: 'PCS', quantity: 0 },
    { sku: 'FGP-005', description: 'Vanilla Langka Pint', uom: 'PCS', quantity: 0 },
    // Liters (FGL)
    { sku: 'FGL-001', description: 'Cafe Mocha Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-002', description: 'Mango Peach Pie Crust Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-003', description: 'Milky Chocolate Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-004', description: 'Suman at Mangga Liter', uom: 'PCS', quantity: 0 },
    { sku: 'FGL-005', description: 'Vanilla Langka Liter', uom: 'PCS', quantity: 0 },
    // Gallons (FGG)
    { sku: 'FGG-001', description: 'Cafe Mocha Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-002', description: 'Mango Peach Pie Crust Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-003', description: 'Milky Chocolate Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-004', description: 'Suman at Mangga Gallon', uom: 'PCS', quantity: 0 },
    { sku: 'FGG-005', description: 'Vanilla Langka Gallon', uom: 'PCS', quantity: 0 },
    // Trays (FGT)
    { sku: 'FGT-001', description: 'Cafe Mocha Tray', uom: 'PCS', quantity: 0 },
    { sku: 'FGT-002', description: 'Mango Peach Pie Crust Tray', uom: 'PCS', quantity: 0 },
    { sku: 'FGT-003', description: 'Milky Chocolate Tray', uom: 'PCS', quantity: 0 },
    { sku: 'FGT-004', description: 'Suman at Mangga Tray', uom: 'PCS', quantity: 0 },
    { sku: 'FGT-005', description: 'Vanilla Langka Tray', uom: 'PCS', quantity: 0 },
];

export const InventoryProvider = ({ children }) => {
    const [inventory, setInventory] = useState([]);
    const [legazpiInventory, setLegazpiInventory] = useState([]); // Legazpi Storage Inventory
    const [history, setHistory] = useState([]); // Stock In History - We might need a table for this later
    const [resellers, setResellers] = useState([]);
    const [resellerOrders, setResellerOrders] = useState([]);
    const [transferOrders, setTransferOrders] = useState([]);
    const [kikiksLocations, setKikiksLocations] = useState(['SM Sorsogon', 'SM Legazpi', 'SM Daet']); // Removed Legazpi Storage
    const [locationSRPs, setLocationSRPs] = useState({});
    const [resellerPrices, setResellerPrices] = useState({});
    const [zonePrices, setZonePrices] = useState({}); // { [zoneId]: { 'FGC': 23, ... } }
    const [resellerZones, setResellerZones] = useState([]);
    const [resellerSettings, setResellerSettings] = useState([]); // Minimum order settings
    const [loading, setLoading] = useState(true);

    // Fetch Data from Supabase
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Inventory
            const { data: invData, error: invError } = await supabase
                .from('inventory')
                .select('*')
                .order('sku', { ascending: true });

            if (invError) throw invError;

            if (invData && invData.length > 0) {
                // Map DB snake_case to camelCase if needed, but for now we just use as is
                // Ensure is_visible_in_reseller_order is present (default true if undefined/null)
                const mappedInv = invData.map(item => ({
                    ...item,
                    isVisible: item.is_visible_in_reseller_order !== false // Default to true
                }));
                setInventory(mappedInv);
            } else {
                // Seed if empty
                const { error: seedError } = await supabase.from('inventory').insert(INITIAL_INVENTORY);
                if (!seedError) setInventory(INITIAL_INVENTORY.map(i => ({ ...i, isVisible: true })));
            }

            // 1b. Legazpi Storage Inventory
            const { data: legazpiData, error: legazpiError } = await supabase
                .from('legazpi_storage_inventory')
                .select('*')
                .order('product_name', { ascending: true });

            if (legazpiError) {
                console.error('Error fetching Legazpi inventory:', legazpiError);
            } else if (legazpiData) {
                setLegazpiInventory(legazpiData);
            }

            // 2. Reseller Zones
            const { data: zoneData } = await supabase.from('reseller_zones').select('*').order('minimum_order_value', { ascending: true });
            if (zoneData) setResellerZones(zoneData);

            // 3. Resellers (Fetch with Zone info if possible, or join client-side)
            const { data: resData } = await supabase.from('resellers').select('*');
            if (resData) setResellers(resData);

            // 4. Reseller Orders
            const { data: roData } = await supabase
                .from('reseller_orders')
                .select('*')
                .order('date', { ascending: false });

            if (roData) {
                // Map DB snake_case to frontend camelCase
                const mappedOrders = roData.map(order => ({
                    id: order.id,
                    resellerName: order.reseller_name,
                    resellerId: order.reseller_id,
                    location: order.location,
                    address: order.address,
                    items: order.items,
                    totalAmount: order.total_amount || order.total,
                    date: order.date,
                    status: order.status,
                    isDeducted: order.is_deducted,
                    hasPackingList: order.has_packing_list, // Add this
                    hasCOA: order.has_coa,                  // Add this
                    coaData: order.coa_data                 // Add this
                }));
                setResellerOrders(mappedOrders);
            }

            // 4. Transfer Orders
            const { data: toData } = await supabase
                .from('transfer_orders')
                .select('*')
                .order('date', { ascending: false });

            if (toData) {
                const mappedTransfers = toData.map(order => ({
                    id: order.id,
                    destination: order.destination, // TO location
                    from_location: order.from_location, // FROM location
                    location: order.destination, // Legacy field for compatibility
                    items: order.items,
                    totalAmount: order.total_amount || order.total,
                    total_amount: order.total_amount,
                    date: order.date,
                    status: order.status,
                    isDeducted: order.is_deducted,
                    hasPackingList: order.has_packing_list
                }));
                setTransferOrders(mappedTransfers);
            }

            // 5. Locations (Optional table, fallback to default if empty or error)
            const { data: locData } = await supabase.from('kikiks_locations').select('*');
            if (locData && locData.length > 0) {
                setKikiksLocations(locData.map(l => l.name));
            }

            // 6. Location SRPs
            const { data: srpData } = await supabase.from('location_srps').select('*');
            if (srpData) {
                const srpMap = {};
                srpData.forEach(item => {
                    if (!srpMap[item.location_name]) srpMap[item.location_name] = {};
                    srpMap[item.location_name][item.sku] = item.price;
                });
                setLocationSRPs(srpMap);
            }

            // 7. Reseller Prices (Category Based)
            const { data: rpData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'reseller_prices')
                .single();

            if (rpData && rpData.value) {
                setResellerPrices(rpData.value);
            }

            // 8. Zone Prices
            const { data: zpData } = await supabase.from('zone_prices').select('*');
            if (zpData) {
                const zpMap = {};
                zpData.forEach(item => {
                    if (!zpMap[item.zone_id]) zpMap[item.zone_id] = {};
                    zpMap[item.zone_id][item.sku_prefix] = Number(item.price);
                });
                setZonePrices(zpMap);
            }

            // 9. Reseller Settings (Minimum Monthly Orders)
            const { data: rsData } = await supabase.from('reseller_settings').select('*');
            if (rsData) {
                setResellerSettings(rsData);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Realtime Subscription for FTF Manufacturing Inventory
        const ftfSubscription = supabase
            .channel('public:inventory')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setInventory(prev => prev.map(item => item.sku === payload.new.sku ? payload.new : item));
                } else if (payload.eventType === 'INSERT') {
                    setInventory(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'DELETE') {
                    setInventory(prev => prev.filter(item => item.sku !== payload.old.sku));
                }
            })
            .subscribe();

        // Realtime Subscription for Legazpi Storage Inventory
        const legazpiSubscription = supabase
            .channel('public:legazpi_storage_inventory')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'legazpi_storage_inventory' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setLegazpiInventory(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
                } else if (payload.eventType === 'INSERT') {
                    setLegazpiInventory(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'DELETE') {
                    setLegazpiInventory(prev => prev.filter(item => item.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ftfSubscription);
            supabase.removeChannel(legazpiSubscription);
        };
    }, []);

    const addStock = async (sku, quantity) => {
        // Optimistic Update
        setInventory(prev => prev.map(item =>
            item.sku === sku
                ? { ...item, quantity: Number(item.quantity) + Number(quantity) }
                : item
        ));

        // DB Update
        // First get current qty to be safe or use RPC. For now, read-modify-write.
        const { data: currentItem } = await supabase.from('inventory').select('quantity').eq('sku', sku).single();
        if (currentItem) {
            const newQty = Number(currentItem.quantity) + Number(quantity);
            await supabase.from('inventory').update({ quantity: newQty }).eq('sku', sku);
        }
    };

    const addHistory = (entry) => {
        setHistory(prev => [entry, ...prev]);
        // TODO: Save history to DB if needed
    };

    const addReseller = async (reseller) => {
        setResellers(prev => [...prev, reseller]);
        await supabase.from('resellers').insert(reseller);
    };

    const updateReseller = async (id, updatedData) => {
        setResellers(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
        await supabase.from('resellers').update(updatedData).eq('id', id);
    };

    const deleteReseller = async (id) => {
        setResellers(prev => prev.filter(r => r.id !== id));
        await supabase.from('resellers').delete().eq('id', id);
    };

    const addResellerOrder = async (order) => {
        // Ensure ID
        const newOrder = { ...order, id: order.id || crypto.randomUUID() };

        // Update Local State
        setResellerOrders(prev => [newOrder, ...prev]);

        // Map to DB snake_case
        const dbOrder = {
            id: newOrder.id,
            reseller_id: newOrder.resellerId,
            reseller_name: newOrder.resellerName,
            location: newOrder.location,
            address: newOrder.address,
            items: newOrder.items,
            total_amount: newOrder.totalAmount,
            date: newOrder.date,
            status: newOrder.status,
            is_deducted: false
        };

        const { error } = await supabase.from('reseller_orders').insert(dbOrder);
        if (error) {
            console.error("Error saving reseller order:", error);
            alert(`Failed to save order to database: ${error.message} \n\nPlease check your internet connection or contact support.`);
            // Optional: Revert local state if critical
        } else {
            // Send Discord notification on successful order
            await sendOrderNotification(newOrder, inventory);
        }
    };

    const updateResellerOrderStatus = async (id, newStatus) => {
        // Find order
        const order = resellerOrders.find(o => o.id === id);
        if (!order) return;

        let updatedOrder = { ...order, status: newStatus };
        let shouldDeduct = false;

        if (newStatus === 'Completed' && order.status !== 'Completed' && !order.isDeducted) {
            updatedOrder.isDeducted = true;
            shouldDeduct = true;
        }

        // Optimistic Update
        setResellerOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));

        // DB Update
        await supabase.from('reseller_orders').update({ status: newStatus, is_deducted: updatedOrder.isDeducted }).eq('id', id);

        if (shouldDeduct) {
            // Deduct stock
            for (const [sku, qty] of Object.entries(order.items)) {
                await addStock(sku, -qty);
            }
        }
    };

    const deleteResellerOrder = async (id) => {
        // Update local state
        setResellerOrders(prev => prev.filter(order => order.id !== id));

        // Delete from database
        const { error } = await supabase
            .from('reseller_orders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting reseller order:", error);
            alert(`Failed to delete order from database: ${error.message}`);
            // Refresh to restore consistency
            await fetchData();
        }
    };

    const updateResellerOrder = async (id, updates) => {
        // Optimistic Update
        setResellerOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));

        // Map camelCase updates to snake_case for DB
        const dbUpdates = {};
        if (updates.hasPackingList !== undefined) dbUpdates.has_packing_list = updates.hasPackingList;
        if (updates.hasCOA !== undefined) dbUpdates.has_coa = updates.hasCOA;
        if (updates.coaData !== undefined) dbUpdates.coa_data = updates.coaData;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('reseller_orders').update(dbUpdates).eq('id', id);
            if (error) {
                console.error("Error updating reseller order:", error);
                alert(`Error updating order: ${error.message}`);
            }
        }
    };

    const addTransferOrder = async (order) => {
        const newOrder = { ...order, id: order.id || crypto.randomUUID(), date: order.date || new Date().toISOString() };
        // Mark as deducted immediately in local state
        newOrder.isDeducted = true;

        setTransferOrders(prev => [newOrder, ...prev]);

        // Build DB order with correct column names
        const dbOrder = {
            id: newOrder.id,
            from_location: newOrder.from_location,
            destination: newOrder.destination,
            items: newOrder.items,
            total_amount: newOrder.total_amount,
            date: newOrder.date,
            status: newOrder.status,
            is_deducted: true
        };

        console.log('=== SAVING TRANSFER TO DATABASE ===');
        console.log('DB Order:', JSON.stringify(dbOrder, null, 2));

        const { data, error } = await supabase.from('transfer_orders').insert(dbOrder).select();

        if (error) {
            console.error("❌ Error saving transfer order:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            alert("Failed to save transfer order: " + error.message);
        } else {
            console.log('✅ Transfer saved successfully!', data);
        }

        // Deduct stock immediately after successful save
        if (!error) {
            for (const [sku, qty] of Object.entries(newOrder.items)) {
                await addStock(sku, -qty);
            }
        }
    };

    const updateTransferOrderStatus = async (id, newStatus) => {
        const order = transferOrders.find(o => o.id === id);
        if (!order) return;

        let updatedOrder = { ...order, status: newStatus };

        // Handle Cancellation (Restock)
        if (newStatus === 'Cancelled' && order.isDeducted) {
            updatedOrder.isDeducted = false;
            for (const [sku, qty] of Object.entries(order.items)) {
                await addStock(sku, qty); // Add back
            }
        }
        // Handle Re-activation from Cancelled (Deduct again)
        else if (newStatus !== 'Cancelled' && !order.isDeducted) {
            updatedOrder.isDeducted = true;
            for (const [sku, qty] of Object.entries(order.items)) {
                await addStock(sku, -qty); // Deduct again
            }
        }

        setTransferOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
        await supabase.from('transfer_orders').update({ status: newStatus, is_deducted: updatedOrder.isDeducted }).eq('id', id);
    };

    const deleteTransferOrder = async (id) => {
        // Find the order to check if stock was deducted
        const order = transferOrders.find(o => o.id === id);
        if (!order) return;

        // Return stock to FTF Manufacturing if it was deducted
        if (order.isDeducted) {
            for (const [sku, qty] of Object.entries(order.items)) {
                await addStock(sku, qty); // Add stock back
            }
        }

        // Update local state
        setTransferOrders(prev => prev.filter(o => o.id !== id));

        // Delete from database
        const { error } = await supabase
            .from('transfer_orders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting transfer order:", error);
            alert(`Failed to delete transfer order: ${error.message}`);
            // Refresh to restore consistency
            await fetchData();
        }
    };

    const updateTransferOrder = async (id, updates) => {
        // Optimistic Update
        setTransferOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));

        // Map camelCase updates to snake_case for DB
        const dbUpdates = {};
        if (updates.hasPackingList !== undefined) dbUpdates.has_packing_list = updates.hasPackingList;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.items !== undefined) dbUpdates.items = updates.items;
        if (updates.total_amount !== undefined) dbUpdates.total_amount = updates.total_amount;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('transfer_orders').update(dbUpdates).eq('id', id);
            if (error) {
                console.error("Error updating transfer order:", error);
                alert(`Error updating transfer order: ${error.message}`);
            }
        }
    };

    // Location Management
    const addKikiksLocation = async (location) => {
        if (!kikiksLocations.includes(location)) {
            setKikiksLocations(prev => [...prev, location]);
            await supabase.from('kikiks_locations').insert({ name: location });
        }
    };

    const updateKikiksLocation = async (oldName, newName) => {
        if (oldName === newName) return;

        // Update State
        setKikiksLocations(prev => prev.map(loc => loc === oldName ? newName : loc));

        // Update SRPs State
        const newSRPs = { ...locationSRPs };
        if (newSRPs[oldName]) {
            newSRPs[newName] = newSRPs[oldName];
            delete newSRPs[oldName];
            setLocationSRPs(newSRPs);
        }

        // DB Updates
        // 1. Update Location Name
        const { error: locError } = await supabase
            .from('kikiks_locations')
            .update({ name: newName })
            .eq('name', oldName);

        if (locError) {
            console.error("Error updating location name:", locError);
            alert("Failed to update location name");
            return;
        }

        // 2. Update SRPs (if they rely on the name as a foreign key or just a string)
        // Assuming location_srps uses location_name as a string key based on previous code
        const { error: srpError } = await supabase
            .from('location_srps')
            .update({ location_name: newName })
            .eq('location_name', oldName);

        if (srpError) console.error("Error updating SRPs location name:", srpError);
    };

    const deleteKikiksLocation = async (location) => {
        if (confirm(`Are you sure you want to delete "${location}"?`)) {
            // Update State
            setKikiksLocations(prev => prev.filter(loc => loc !== location));

            const newSRPs = { ...locationSRPs };
            delete newSRPs[location];
            setLocationSRPs(newSRPs);

            // DB Updates
            await supabase.from('kikiks_locations').delete().eq('name', location);
            await supabase.from('location_srps').delete().eq('location_name', location);
        }
    };

    const updateLocationSRP = async (location, sku, price) => {
        setLocationSRPs(prev => ({
            ...prev,
            [location]: {
                ...(prev[location] || {}),
                [sku]: Number(price)
            }
        }));

        await supabase.from('location_srps').upsert({
            location_name: location,
            sku: sku,
            price: Number(price)
        });
    };

    const updateLocationCategoryPrices = async (location, categoryPrices) => {
        // categoryPrices is { 'FGC': 25, 'FGP': 85, ... }

        const updates = [];
        const newLocationPrices = { ...(locationSRPs[location] || {}) };

        inventory.forEach(item => {
            const prefix = item.sku.split('-')[0];
            if (categoryPrices[prefix] !== undefined) {
                const price = Number(categoryPrices[prefix]);
                newLocationPrices[item.sku] = price;
                updates.push({
                    location_name: location,
                    sku: item.sku,
                    price: price
                });
            }
        });

        // Optimistic Update
        setLocationSRPs(prev => ({
            ...prev,
            [location]: newLocationPrices
        }));

        // Batch Update DB
        if (updates.length > 0) {
            const { error } = await supabase.from('location_srps').upsert(updates);
            if (error) {
                console.error("Error bulk updating prices:", error);
                alert("Failed to save prices.");
            }
        }
    };

    const addSku = async (newItem) => {
        // Check local first
        if (inventory.some(item => item.sku === newItem.sku)) {
            alert('SKU already exists!');
            return;
        }

        const itemWithQty = { ...newItem, quantity: 0 };
        setInventory(prev => [...prev, itemWithQty]);

        const { error } = await supabase.from('inventory').insert(itemWithQty);
        if (error) {
            alert('Error adding SKU to DB: ' + error.message);
            // Revert?
        }
    };

    const updateSku = async (oldSku, updatedItem) => {
        setInventory(prev => prev.map(item => item.sku === oldSku ? { ...item, ...updatedItem } : item));
        await supabase.from('inventory').update(updatedItem).eq('sku', oldSku);
    };

    const deleteSku = async (sku) => {
        setInventory(prev => prev.filter(item => item.sku !== sku));
        await supabase.from('inventory').delete().eq('sku', sku);
    };

    const toggleSkuVisibility = async (sku, isVisible) => {
        setInventory(prev => prev.map(item => item.sku === sku ? { ...item, isVisible } : item));
        await supabase.from('inventory').update({ is_visible_in_reseller_order: isVisible }).eq('sku', sku);
    };

    // ============================================================
    // LEGAZPI STORAGE INVENTORY METHODS
    // ============================================================

    const addLegazpiProduct = async (product) => {
        const newProduct = {
            product_name: product.product_name,
            flavor: product.flavor,
            quantity: Number(product.quantity) || 0,
            unit: product.unit
        };

        const { data, error } = await supabase
            .from('legazpi_storage_inventory')
            .insert(newProduct)
            .select()
            .single();

        if (error) {
            console.error('Error adding Legazpi product:', error);
            alert('Failed to add product: ' + error.message);
            return;
        }

        setLegazpiInventory(prev => [...prev, data]);
    };

    const updateLegazpiProduct = async (id, updates) => {
        // Optimistic update
        setLegazpiInventory(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));

        const { error } = await supabase
            .from('legazpi_storage_inventory')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating Legazpi product:', error);
            alert('Failed to update product: ' + error.message);
            // Refresh to restore consistency
            await fetchData();
        }
    };

    const deleteLegazpiProduct = async (id) => {
        // Optimistic update
        setLegazpiInventory(prev => prev.filter(item => item.id !== id));

        const { error } = await supabase
            .from('legazpi_storage_inventory')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting Legazpi product:', error);
            alert('Failed to delete product: ' + error.message);
            // Refresh to restore consistency
            await fetchData();
        }
    };

    const addLegazpiStock = async (id, quantity) => {
        // Optimistic Update
        setLegazpiInventory(prev => prev.map(item =>
            item.id === id
                ? { ...item, quantity: Number(item.quantity) + Number(quantity) }
                : item
        ));

        // DB Update
        const { data: currentItem } = await supabase
            .from('legazpi_storage_inventory')
            .select('quantity')
            .eq('id', id)
            .single();

        if (currentItem) {
            const newQty = Number(currentItem.quantity) + Number(quantity);
            await supabase
                .from('legazpi_storage_inventory')
                .update({ quantity: newQty })
                .eq('id', id);
        }
    };

    // Zone Management
    const addResellerZone = async (zone) => {
        const { data, error } = await supabase.from('reseller_zones').insert(zone).select().single();
        if (error) {
            console.error("Error adding zone:", error);
            alert("Failed to add zone");
            return;
        }
        setResellerZones(prev => [...prev, data]);
    };

    const updateResellerZone = async (id, updates) => {
        setResellerZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
        await supabase.from('reseller_zones').update(updates).eq('id', id);
    };

    const deleteResellerZone = async (id) => {
        setResellerZones(prev => prev.filter(z => z.id !== id));
        await supabase.from('reseller_zones').delete().eq('id', id);
    };

    const updateZonePrice = async (zoneId, prefix, price) => {
        // Optimistic Update
        setZonePrices(prev => ({
            ...prev,
            [zoneId]: {
                ...(prev[zoneId] || {}),
                [prefix]: Number(price)
            }
        }));

        // DB Update
        const { error } = await supabase.from('zone_prices').upsert({
            zone_id: zoneId,
            sku_prefix: prefix,
            price: Number(price),
            updated_at: new Date().toISOString()
        }, { onConflict: 'zone_id, sku_prefix' });

        if (error) {
            console.error("Error updating zone price:", error);
            alert("Failed to save zone price");
        }
    };

    // Reseller Settings Management
    const fetchResellerSettings = async () => {
        const { data, error } = await supabase.from('reseller_settings').select('*');
        if (error) {
            console.error("Error fetching reseller settings:", error);
            return;
        }
        setResellerSettings(data || []);
    };

    const updateResellerSetting = async (resellerName, minimumMonthlyOrder, startDate) => {
        // Check if setting exists
        const existing = resellerSettings.find(s => s.reseller_name === resellerName);

        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('reseller_settings')
                .update({
                    minimum_monthly_order: Number(minimumMonthlyOrder),
                    start_date: startDate
                })
                .eq('reseller_name', resellerName);

            if (error) {
                console.error("Error updating reseller setting:", error);
                alert("Failed to update minimum order setting");
                return;
            }

            // Update local state
            setResellerSettings(prev => prev.map(s =>
                s.reseller_name === resellerName
                    ? {
                        ...s,
                        minimum_monthly_order: Number(minimumMonthlyOrder),
                        start_date: startDate // Update local state
                    }
                    : s
            ));
        } else {
            // Create new
            const { data, error } = await supabase
                .from('reseller_settings')
                .insert({
                    reseller_name: resellerName,
                    minimum_monthly_order: Number(minimumMonthlyOrder),
                    start_date: startDate // Insert new
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating reseller setting:", error);
                alert("Failed to create minimum order setting");
                return;
            }

            // Add to local state
            setResellerSettings(prev => [...prev, data]);
        }
    };

    return (
        <InventoryContext.Provider value={{
            inventory, addStock,
            legazpiInventory, addLegazpiProduct, updateLegazpiProduct, deleteLegazpiProduct, addLegazpiStock,
            history, addHistory,
            resellers, addReseller, updateReseller, deleteReseller,
            resellerOrders, addResellerOrder, updateResellerOrderStatus, updateResellerOrder, deleteResellerOrder,
            transferOrders, addTransferOrder, updateTransferOrderStatus, deleteTransferOrder, updateTransferOrder,
            kikiksLocations, addKikiksLocation, updateKikiksLocation, deleteKikiksLocation,
            locationSRPs, updateLocationSRP, updateLocationCategoryPrices,
            resellerPrices,
            zonePrices, updateZonePrice,
            addSku, updateSku, deleteSku, toggleSkuVisibility,
            resellerZones, addResellerZone, updateResellerZone, deleteResellerZone,
            resellerSettings, fetchResellerSettings, updateResellerSetting,
            loading
        }}>
            {children}
        </InventoryContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useInventory = () => useContext(InventoryContext);
