import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const BranchInventoryContext = createContext();

export const useBranchInventory = () => {
    const context = useContext(BranchInventoryContext);
    if (!context) {
        throw new Error('useBranchInventory must be used within BranchInventoryProvider');
    }
    return context;
};

export const BranchInventoryProvider = ({ children }) => {
    const [branchInventory, setBranchInventory] = useState([]);
    const [branchHistory, setBranchHistory] = useState([]);
    const [branchCapacitySettings, setBranchCapacitySettings] = useState([]);
    const [importLogs, setImportLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch all branch inventory data
    const fetchBranchData = async () => {
        try {
            setLoading(true);

            // Fetch current inventory
            const { data: inventory, error: invError } = await supabase
                .from('branch_inventory')
                .select('*')
                .order('branch_location', { ascending: true })
                .order('sku', { ascending: true });

            if (invError) throw invError;
            setBranchInventory(inventory || []);

            // Fetch capacity settings
            const { data: capacity, error: capError } = await supabase
                .from('branch_capacity_settings')
                .select('*')
                .order('branch_location', { ascending: true });

            if (capError) throw capError;
            setBranchCapacitySettings(capacity || []);

            // Fetch recent import logs
            const { data: logs, error: logError } = await supabase
                .from('branch_utak_import_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (logError) throw logError;
            setImportLogs(logs || []);

        } catch (error) {
            console.error('Error fetching branch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranchData();
    }, []);

    // Get stock for a specific branch and SKU
    const getBranchStock = (branchLocation, sku) => {
        const item = branchInventory.find(
            inv => inv.branch_location === branchLocation && inv.sku === sku
        );
        return item?.current_stock || 0;
    };

    // Get all inventory for a specific branch
    const getBranchInventory = (branchLocation) => {
        return branchInventory.filter(inv => inv.branch_location === branchLocation);
    };

    // Helper to extract size category from SKU
    const getSizeCategory = (sku) => {
        if (!sku) return null;
        const prefix = sku.split('-')[0]; // e.g., "FGC" from "FGC-001"
        const sizeMap = {
            'FGC': 'Cups',
            'FGP': 'Pints',
            'FGL': 'Liters',
            'FGG': 'Gallons',
            'FGT': 'Trays'
        };
        return sizeMap[prefix] || null;
    };

    // Get capacity settings for a branch + size category
    const getCapacitySetting = (branchLocation, sku) => {
        const sizeCategory = getSizeCategory(sku);
        if (!sizeCategory) return null;

        // Ensure branchCapacitySettings is defined before searching
        const settings = branchCapacitySettings || [];

        return settings.find(
            cap => cap.branch_location === branchLocation && cap.size_category === sizeCategory
        );
    };

    // Get total stock for a size category at a branch (sum of all flavors)
    const getTotalStockBySize = (branchLocation, sku) => {
        const sizeCategory = getSizeCategory(sku);
        if (!sizeCategory) return 0;

        const prefix = sku.split('-')[0];
        const sameSize = branchInventory.filter(
            inv => inv.branch_location === branchLocation && inv.sku.startsWith(prefix)
        );

        return sameSize.reduce((total, item) => total + (item.current_stock || 0), 0);
    };

    // Update or insert branch inventory (upsert)
    const upsertBranchInventory = async (branchLocation, sku, stockData) => {
        try {
            const { data, error } = await supabase
                .from('branch_inventory')
                .upsert({
                    branch_location: branchLocation,
                    sku: sku,
                    ...stockData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'branch_location,sku'
                })
                .select();

            if (error) throw error;

            // Refresh data
            await fetchBranchData();
            return data;
        } catch (error) {
            console.error('Error upserting branch inventory:', error);
            throw error;
        }
    };

    // Batch import from Utak CSV
    const importUtakData = async (branchLocation, utakData, mappings) => {
        try {
            const importLog = {
                branch_location: branchLocation,
                file_name: `Import ${new Date().toISOString()}`,
                products_imported: 0,
                products_matched: 0,
                products_unmatched: 0,
                import_status: 'success',
                error_log: {}
            };

            const historyEntries = [];
            const inventoryUpdates = [];

            for (const utakItem of utakData) {
                // Try to match to SKU
                const sku = mappings[utakItem.title] || null;

                if (sku) {
                    importLog.products_matched++;

                    // Get current stock to track changes
                    const currentStock = getBranchStock(branchLocation, sku);
                    const newStock = parseInt(utakItem.end) || 0;

                    // Prepare inventory update
                    inventoryUpdates.push({
                        branch_location: branchLocation,
                        sku: sku,
                        product_description: utakItem.title,
                        category: utakItem.category,
                        current_stock: newStock,
                        last_sync_date: new Date().toISOString(),
                        last_sync_source: 'utak_import',
                        sync_metadata: utakItem
                    });

                    // Track history
                    historyEntries.push({
                        branch_location: branchLocation,
                        sku: sku,
                        product_description: utakItem.title,
                        change_type: 'utak_import',
                        quantity_before: currentStock,
                        quantity_change: newStock - currentStock,
                        quantity_after: newStock,
                        source_data: utakItem
                    });
                } else {
                    importLog.products_unmatched++;
                }
            }

            importLog.products_imported = inventoryUpdates.length;

            // Batch insert/update inventory
            if (inventoryUpdates.length > 0) {
                const { error: invError } = await supabase
                    .from('branch_inventory')
                    .upsert(inventoryUpdates, {
                        onConflict: 'branch_location,sku'
                    });

                if (invError) throw invError;
            }

            // Batch insert history
            if (historyEntries.length > 0) {
                const { error: histError } = await supabase
                    .from('branch_inventory_history')
                    .insert(historyEntries);

                if (histError) throw histError;
            }

            // Log the import
            const { error: logError } = await supabase
                .from('branch_utak_import_log')
                .insert(importLog);

            if (logError) throw logError;

            // Refresh data
            await fetchBranchData();

            return {
                success: true,
                imported: importLog.products_imported,
                matched: importLog.products_matched,
                unmatched: importLog.products_unmatched
            };

        } catch (error) {
            console.error('Error importing Utak data:', error);
            throw error;
        }
    };

    // Set capacity for a branch + Size Category
    const setCapacity = async (branchLocation, sizeCategory, capacityData) => {
        try {
            const { data, error } = await supabase
                .from('branch_capacity_settings')
                .upsert({
                    branch_location: branchLocation,
                    size_category: sizeCategory,
                    sku: null, // explicit null
                    ...capacityData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'branch_location,size_category'
                })
                .select();

            if (error) throw error;

            await fetchBranchData();
            return data;
        } catch (error) {
            console.error('Error setting capacity:', error);
            throw error;
        }
    };

    // Manual stock adjustment
    const adjustStock = async (branchLocation, sku, newStock, notes = '') => {
        try {
            const currentStock = getBranchStock(branchLocation, sku);

            // Update inventory
            await upsertBranchInventory(branchLocation, sku, {
                current_stock: newStock,
                last_sync_source: 'manual',
                last_sync_date: new Date().toISOString()
            });

            // Log history
            const { error: histError } = await supabase
                .from('branch_inventory_history')
                .insert({
                    branch_location: branchLocation,
                    sku: sku,
                    change_type: 'manual_adjustment',
                    quantity_before: currentStock,
                    quantity_change: newStock - currentStock,
                    quantity_after: newStock,
                    notes: notes
                });

            if (histError) throw histError;

            await fetchBranchData();
        } catch (error) {
            console.error('Error adjusting stock:', error);
            throw error;
        }
    };

    const value = {
        branchInventory,
        branchHistory,
        branchCapacitySettings,
        capacitySettings: branchCapacitySettings,
        importLogs,
        loading,
        fetchBranchData,
        getBranchStock,
        getBranchInventory,
        getCapacitySetting,
        getTotalStockBySize,
        upsertBranchInventory,
        importUtakData,
        setCapacity,
        adjustStock
    };

    return (
        <BranchInventoryContext.Provider value={value}>
            {children}
        </BranchInventoryContext.Provider>
    );
};
