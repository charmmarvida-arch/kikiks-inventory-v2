import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Settings, Edit2, Save, X, Search, Download, Filter, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import FTFSettingsModal from './FTFSettingsModal';
import { exportToExcel, exportToCSV, formatInventoryData, getExportColumns } from '../utils/exportHelpers';

const DEFAULT_SRP_PRICES = {
    'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 0
};

const DEFAULT_COGS_PRICES = {
    'FGC': 0, 'FGP': 0, 'FGL': 0, 'FGG': 0, 'FGT': 0
};

const FTFManufacturing = () => {
    const { inventory, addStock } = useInventory();
    const { user } = useAuth();

    // Core state
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, instock, lowstock, outofstock
    const [sortBy, setSortBy] = useState('sku'); // sku, stock, value

    // Settings & Prices
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [srpPrices, setSRPPrices] = useState(DEFAULT_SRP_PRICES);
    const [cogsPrices, setCOGSPrices] = useState(DEFAULT_COGS_PRICES);
    const [thresholds, setThresholds] = useState({});
    const [productionDates, setProductionDates] = useState({});

    // Column visibility
    const [columnVisibility, setColumnVisibility] = useState({
        showSRP: false,
        showCOGS: false,
        showProfitMargin: false,
        showTotalValue: false,
        showProductionDate: false
    });

    // Stock editing
    const [editingStock, setEditingStock] = useState(null); // { sku, newQty, reason, notes }
    const [adjustmentReasons, setAdjustmentReasons] = useState([]);

    // Export settings
    const [exportSettings, setExportSettings] = useState({
        format: 'excel',
        companyName: 'Kikiks Manufacturing',
        reportTitle: 'FTF Manufacturing Inventory Report'
    });

    // Load all data on mount
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            // Load SRP prices
            const { data: srpData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'ftf_srp_prices')
                .single();
            if (srpData?.value) setSRPPrices(srpData.value);

            // Load COGS prices
            const { data: cogsData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'ftf_cogs_prices')
                .single();
            if (cogsData?.value) setCOGSPrices(cogsData.value);

            // Load thresholds
            const { data: thresholdsData } = await supabase
                .from('ftf_low_stock_thresholds')
                .select('*');
            if (thresholdsData) {
                const thresholdsMap = {};
                thresholdsData.forEach(t => {
                    thresholdsMap[t.sku] = t.minimum_threshold;
                });
                setThresholds(thresholdsMap);
            }

            // Load production dates
            const { data: prodDates } = await supabase
                .from('ftf_production_tracking')
                .select('*');
            if (prodDates) {
                const datesMap = {};
                prodDates.forEach(p => {
                    datesMap[p.sku] = p.last_production_date;
                });
                setProductionDates(datesMap);
            }

            // Load adjustment reasons
            const { data: reasonsData } = await supabase
                .from('ftf_adjustment_reasons')
                .select('*')
                .eq('is_active', true)
                .order('display_order');
            if (reasonsData) setAdjustmentReasons(reasonsData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleSettingsClick = async () => {
        const password = prompt("Enter Admin Password:");
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_password')
            .single();

        const adminPassword = data?.value || "1234";

        if (password === adminPassword) {
            setIsSettingsOpen(true);
        } else if (password !== null) {
            alert("Incorrect Password");
        }
    };

    const startEdit = (sku, currentQty) => {
        setEditingStock({
            sku,
            oldQty: currentQty,
            newQty: currentQty,
            reasonId: null,
            notes: ''
        });
    };

    const cancelEdit = () => {
        setEditingStock(null);
    };

    const saveStockAdjustment = async () => {
        if (!editingStock) return;

        const { sku, oldQty, newQty, reasonId, notes } = editingStock;

        if (newQty === oldQty) {
            cancelEdit();
            return;
        }

        if (!reasonId) {
            alert('Please select a reason for the adjustment');
            return;
        }

        try {
            const diff = newQty - oldQty;

            // Update inventory
            await addStock(sku, diff);

            // Log adjustment
            await supabase.from('ftf_stock_adjustments').insert([{
                sku,
                old_quantity: oldQty,
                new_quantity: newQty,
                reason_id: reasonId,
                notes: notes || null,
                adjusted_by: user?.id || null
            }]);

            cancelEdit();
            alert('Stock updated successfully');
        } catch (error) {
            console.error('Error saving adjustment:', error);
            alert('Failed to update stock');
        }
    };

    const handleExport = () => {
        const formattedData = formatInventoryData(
            filteredAndSortedInventory,
            columnVisibility,
            { srp: srpPrices, cogs: cogsPrices }
        );

        const columns = getExportColumns(columnVisibility);

        if (exportSettings.format === 'excel') {
            exportToExcel(formattedData, columns, exportSettings);
        } else {
            exportToCSV(formattedData, columns, exportSettings);
        }
    };

    // Calculate values for each item
    const enrichInventoryData = (item) => {
        const prefix = item.sku.split('-')[0];
        const srp = srpPrices[prefix] || 0;
        const cogs = cogsPrices[prefix] || 0;
        const profitMargin = srp - cogs;
        const totalValue = srp * item.quantity;
        const totalCost = cogs * item.quantity;
        const threshold = thresholds[item.sku] || 0;
        const productionDate = productionDates[item.sku] || null;

        // Determine stock status
        let stockStatus = 'normal';
        if (item.quantity === 0) stockStatus = 'outofstock';
        else if (threshold > 0 && item.quantity <= threshold) stockStatus = 'lowstock';
        else if (item.quantity > threshold) stockStatus = 'instock';

        return {
            ...item,
            srp,
            cogs,
            profitMargin,
            totalValue,
            totalCost,
            threshold,
            productionDate,
            stockStatus
        };
    };

    // Filter and sort inventory
    const filteredAndSortedInventory = inventory
        .filter(item => {
            // Search filter
            const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            // Status filter
            const enriched = enrichInventoryData(item);
            if (activeFilter === 'instock' && enriched.stockStatus !== 'instock') return false;
            if (activeFilter === 'lowstock' && enriched.stockStatus !== 'lowstock') return false;
            if (activeFilter === 'outofstock' && enriched.stockStatus !== 'outofstock') return false;

            return true;
        })
        .map(enrichInventoryData)
        .sort((a, b) => {
            // Sort by selected criteria
            if (sortBy === 'stock') {
                return b.quantity - a.quantity;
            } else if (sortBy === 'value') {
                return b.totalValue - a.totalValue;
            } else {
                // Default: sort by SKU (product type then name)
                const priority = { 'FGC': 1, 'FGP': 2, 'FGL': 3, 'FGG': 4, 'FGT': 5 };
                const getPrefix = (sku) => sku.split('-')[0];
                const pA = priority[getPrefix(a.sku)] || 99;
                const pB = priority[getPrefix(b.sku)] | 99;
                if (pA !== pB) return pA - pB;
                return a.sku.localeCompare(b.sku);
            }
        });

    // Calculate totals
    const totals = {
        totalItems: filteredAndSortedInventory.length,
        totalStock: filteredAndSortedInventory.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: filteredAndSortedInventory.reduce((sum, item) => sum + item.totalValue, 0),
        totalCost: filteredAndSortedInventory.reduce((sum, item) => sum + item.totalCost, 0),
        lowStockCount: filteredAndSortedInventory.filter(i => i.stockStatus === 'lowstock').length,
        outOfStockCount: filteredAndSortedInventory.filter(i => i.stockStatus === 'outofstock').length
    };

    const getStockStatusColor = (status) => {
        switch (status) {
            case 'outofstock': return '#ef4444'; // red
            case 'lowstock': return '#f59e0b'; // orange
            case 'instock': return '#10b981'; // green
            default: return '#6b7280'; // gray
        }
    };

    return (
        <div className="fade-in">
            {/* Modern Top Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <div>
                    <h2 className="page-title" style={{ marginBottom: '0.25rem' }}>FTF Manufacturing</h2>
                    <p className="page-subtitle">Manufacturing & Warehouse Inventory</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="icon-btn text-success"
                        title="Export Data"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={handleSettingsClick}
                        className="icon-btn text-primary"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div className="form-card p-4">
                    <div className="text-secondary text-sm mb-1">Total SKUs</div>
                    <div className="text-2xl font-bold text-primary">{totals.totalItems}</div>
                </div>
                <div className="form-card p-4">
                    <div className="text-secondary text-sm mb-1">Total Stock</div>
                    <div className="text-2xl font-bold">{totals.totalStock.toLocaleString()}</div>
                </div>
                {columnVisibility.showTotalValue && (
                    <div className="form-card p-4">
                        <div className="text-secondary text-sm mb-1">Total Value</div>
                        <div className="text-2xl font-bold text-success">₱{totals.totalValue.toLocaleString()}</div>
                    </div>
                )}
                {totals.lowStockCount > 0 && (
                    <div className="form-card p-4" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div className="text-secondary text-sm mb-1">Low Stock Alerts</div>
                        <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{totals.lowStockCount}</div>
                    </div>
                )}
                {totals.outOfStockCount > 0 && (
                    <div className="form-card p-4" style={{ borderLeft: '4px solid #ef4444' }}>
                        <div className="text-secondary text-sm mb-1">Out of Stock</div>
                        <div className="text-2xl font-bold text-danger">{totals.outOfStockCount}</div>
                    </div>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="form-card p-4 mb-4">
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }} />
                        <input
                            type="text"
                            placeholder="Search SKU or Description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="premium-input"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>

                    {/* Filter Chips */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['all', 'instock', 'lowstock', 'outofstock'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: activeFilter === filter ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                    background: activeFilter === filter ? 'var(--primary-light)' : 'white',
                                    color: activeFilter === filter ? 'var(--primary)' : 'var(--text-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem',
                                    fontWeight: activeFilter === filter ? '600' : '400',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {filter.replace('stock', ' Stock')}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="premium-input"
                        style={{ width: 'auto', minWidth: '150px' }}
                    >
                        <option value="sku">Sort by SKU</option>
                        <option value="stock">Sort by Stock</option>
                        <option value="value">Sort by Value</option>
                    </select>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="form-card p-0 overflow-hidden">
                <div className="table-container">
                    <table className="inventory-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                            <tr>
                                <th>Status</th>
                                <th>SKU</th>
                                <th>Product Description</th>
                                <th>UOM</th>
                                <th>Current Stock</th>
                                {columnVisibility.showSRP && <th>SRP</th>}
                                {columnVisibility.showCOGS && <th>COGS</th>}
                                {columnVisibility.showProfitMargin && <th>Margin</th>}
                                {columnVisibility.showTotalValue && <th>Total Value</th>}
                                {columnVisibility.showProductionDate && <th>Production Date</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedInventory.map((item, index) => {
                                const currentPrefix = item.sku.split('-')[0];
                                const prevPrefix = index > 0 ? filteredAndSortedInventory[index - 1].sku.split('-')[0] : null;
                                const showSpacer = index > 0 && currentPrefix !== prevPrefix;
                                const isEditing = editingStock?.sku === item.sku;

                                return (
                                    <React.Fragment key={item.sku}>
                                        {showSpacer && (
                                            <tr className="spacer-row">
                                                <td colSpan={20} style={{ height: '8px', background: 'var(--gray-50)' }}></td>
                                            </tr>
                                        )}
                                        <tr style={{
                                            borderLeft: `4px solid ${getStockStatusColor(item.stockStatus)}`,
                                            transition: 'all 0.2s'
                                        }}>
                                            <td>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: getStockStatusColor(item.stockStatus),
                                                    margin: '0 auto'
                                                }}></div>
                                            </td>
                                            <td className="font-medium">{item.sku}</td>
                                            <td>{item.description}</td>
                                            <td>{item.uom}</td>
                                            <td className="font-bold text-lg" style={{ color: getStockStatusColor(item.stockStatus) }}>
                                                {item.quantity.toLocaleString()}
                                                {item.threshold > 0 && <span className="text-sm text-secondary"> / {item.threshold}</span>}
                                            </td>
                                            {columnVisibility.showSRP && (
                                                <td className="font-medium">
                                                    {item.srp > 0 ? `₱${item.srp.toLocaleString()}` : '-'}
                                                </td>
                                            )}
                                            {columnVisibility.showCOGS && (
                                                <td className="font-medium">
                                                    {item.cogs > 0 ? `₱${item.cogs.toLocaleString()}` : '-'}
                                                </td>
                                            )}
                                            {columnVisibility.showProfitMargin && (
                                                <td className="font-medium" style={{ color: item.profitMargin > 0 ? '#10b981' : '#ef4444' }}>
                                                    {item.profitMargin > 0 ? `₱${item.profitMargin.toLocaleString()}` : '-'}
                                                </td>
                                            )}
                                            {columnVisibility.showTotalValue && (
                                                <td className="font-bold text-success">
                                                    {item.totalValue > 0 ? `₱${item.totalValue.toLocaleString()}` : '-'}
                                                </td>
                                            )}
                                            {columnVisibility.showProductionDate && (
                                                <td className="text-sm">
                                                    {item.productionDate || 'N/A'}
                                                </td>
                                            )}
                                            <td>
                                                <button
                                                    onClick={() => startEdit(item.sku, item.quantity)}
                                                    className="icon-btn text-primary small-btn"
                                                    title="Adjust Stock"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stock Adjustment Modal */}
            {editingStock && (
                <div className="modal-overlay" onClick={cancelEdit}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Adjust Stock - {editingStock.sku}</h2>
                            <button className="close-btn" onClick={cancelEdit}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">New Quantity</label>
                                <input
                                    type="number"
                                    value={editingStock.newQty}
                                    onChange={(e) => setEditingStock({ ...editingStock, newQty: parseInt(e.target.value) || 0 })}
                                    className="premium-input"
                                    style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                                    autoFocus
                                />
                                <div className="text-sm text-secondary mt-1">
                                    Difference: {editingStock.newQty - editingStock.oldQty >= 0 ? '+' : ''}
                                    {editingStock.newQty - editingStock.oldQty}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Reason *</label>
                                <select
                                    value={editingStock.reasonId || ''}
                                    onChange={(e) => setEditingStock({ ...editingStock, reasonId: parseInt(e.target.value) })}
                                    className="premium-input"
                                >
                                    <option value="">Select reason...</option>
                                    {adjustmentReasons.map(reason => (
                                        <option key={reason.id} value={reason.id}>{reason.reason_text}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Notes (Optional)</label>
                                <textarea
                                    value={editingStock.notes}
                                    onChange={(e) => setEditingStock({ ...editingStock, notes: e.target.value })}
                                    className="premium-input"
                                    rows={3}
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={saveStockAdjustment} className="submit-btn flex-1">
                                    <Save size={18} className="mr-2" />
                                    Save Adjustment
                                </button>
                                <button onClick={cancelEdit} className="icon-btn flex-1 border border-gray-300">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            <FTFSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => {
                    setIsSettingsOpen(false);
                    loadAllData(); // Reload data after settings change
                }}
                inventory={inventory}
            />
        </div>
    );
};

export default FTFManufacturing;
