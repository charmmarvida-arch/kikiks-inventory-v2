import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PRODUCT_TYPES = [
    { key: 'FGC', label: 'Cup (FGC)' },
    { key: 'FGP', label: 'Pint (FGP)' },
    { key: 'FGL', label: 'Liter (FGL)' },
    { key: 'FGG', label: 'Gallon (FGG)' },
    { key: 'FGT', label: 'Tray (FGT)' }
];

const FTFSettingsModal = ({ isOpen, onClose, inventory }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);

    // Tab 1: View Settings
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState({
        showSRP: false,
        showCOGS: false,
        showProfitMargin: false,
        showTotalValue: false,
        showProductionDate: false
    });

    // Tab 2: SRP Prices
    const [srpPrices, setSRPPrices] = useState({
        FGC: 23, FGP: 85, FGL: 170, FGG: 680, FGT: 0
    });

    // Tab 3: Cost of Goods
    const [cogsPrices, setCOGSPrices] = useState({
        FGC: 0, FGP: 0, FGL: 0, FGG: 0, FGT: 0
    });

    // Tab 4: Adjustment Reasons
    const [adjustmentReasons, setAdjustmentReasons] = useState([]);
    const [isAddingReason, setIsAddingReason] = useState(false);
    const [editingReason, setEditingReason] = useState(null);
    const [newReasonText, setNewReasonText] = useState('');

    // Tab 5: Low Stock Thresholds
    const [thresholds, setThresholds] = useState({});
    const [thresholdSearch, setThresholdSearch] = useState('');

    // Tab 6: Export Settings
    const [exportSettings, setExportSettings] = useState({
        format: 'excel',
        companyName: 'Kikiks Manufacturing',
        reportTitle: 'FTF Manufacturing Inventory Report',
        includeColumns: {
            sku: true,
            description: true,
            stock: true,
            srp: true,
            cogs: true,
            productionDate: false
        }
    });

    // Load data on mount
    useEffect(() => {
        if (isOpen) {
            loadAllSettings();
        }
    }, [isOpen]);

    const loadAllSettings = async () => {
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

            // Load adjustment reasons
            const { data: reasonsData } = await supabase
                .from('ftf_adjustment_reasons')
                .select('*')
                .eq('is_active', true)
                .order('display_order');
            if (reasonsData) setAdjustmentReasons(reasonsData);

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
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleSave = async () => {
        try {
            // Save based on active tab
            switch (activeTab) {
                case 1: // SRP Prices
                    await supabase.from('app_settings').upsert({
                        key: 'ftf_srp_prices',
                        value: srpPrices
                    }, { onConflict: 'key' });
                    break;

                case 2: // COGS Prices
                    await supabase.from('app_settings').upsert({
                        key: 'ftf_cogs_prices',
                        value: cogsPrices
                    }, { onConflict: 'key' });
                    break;

                case 4: // Thresholds
                    // Delete old thresholds and insert new ones
                    await supabase.from('ftf_low_stock_thresholds').delete().neq('sku', '');
                    const thresholdData = Object.entries(thresholds).map(([sku, threshold]) => ({
                        sku,
                        minimum_threshold: threshold || 0
                    }));
                    if (thresholdData.length > 0) {
                        await supabase.from('ftf_low_stock_thresholds').insert(thresholdData);
                    }
                    break;
            }

            setHasChanges(false);
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        }
    };

    const addAdjustmentReason = async () => {
        if (!newReasonText.trim()) return;

        try {
            const { data, error } = await supabase
                .from('ftf_adjustment_reasons')
                .insert([{
                    reason_text: newReasonText.trim(),
                    display_order: adjustmentReasons.length + 1
                }])
                .select();

            if (error) throw error;

            setAdjustmentReasons([...adjustmentReasons, data[0]]);
            setNewReasonText('');
            setIsAddingReason(false);
        } catch (error) {
            console.error('Error adding reason:', error);
            alert('Failed to add reason');
        }
    };

    const deleteAdjustmentReason = async (id) => {
        if (!confirm('Are you sure you want to delete this reason?')) return;

        try {
            await supabase
                .from('ftf_adjustment_reasons')
                .update({ is_active: false })
                .eq('id', id);

            setAdjustmentReasons(adjustmentReasons.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting reason:', error);
            alert('Failed to delete reason');
        }
    };

    const updateAdjustmentReason = async (id, newText) => {
        try {
            await supabase
                .from('ftf_adjustment_reasons')
                .update({ reason_text: newText })
                .eq('id', id);

            setAdjustmentReasons(adjustmentReasons.map(r =>
                r.id === id ? { ...r, reason_text: newText } : r
            ));
            setEditingReason(null);
        } catch (error) {
            console.error('Error updating reason:', error);
            alert('Failed to update reason');
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.sku.toLowerCase().includes(thresholdSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(thresholdSearch.toLowerCase())
    );

    if (!isOpen) return null;

    const tabs = [
        { id: 0, label: 'View', icon: '👁️' },
        { id: 1, label: 'SRP Pricing', icon: '💰' },
        { id: 2, label: 'Cost of Goods', icon: '📊' },
        { id: 3, label: 'Adjustments', icon: '📝' },
        { id: 4, label: 'Thresholds', icon: '⚠️' },
        { id: 5, label: 'Export', icon: '📤' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', height: '80vh' }}>
                <div className="modal-header">
                    <h2 className="modal-title">FTF Manufacturing Settings</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    padding: '1rem 1.5rem 0',
                    borderBottom: '2px solid var(--border-color)',
                    overflowX: 'auto'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                border: 'none',
                                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                borderRadius: '8px 8px 0 0',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === tab.id ? '600' : '400',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Tab 0: View Settings */}
                    {activeTab === 0 && (
                        <div>
                            <h3 className="mb-4">View & Column Settings</h3>
                            <p className="text-secondary mb-6">Configure which columns appear in the main table</p>

                            <div className="form-card p-6">
                                <h4 className="mb-4">Column Visibility</h4>
                                <div className="flex flex-col gap-3">
                                    {[
                                        { key: 'showSRP', label: 'SRP (Suggested Retail Price)' },
                                        { key: 'showCOGS', label: 'Cost of Goods' },
                                        { key: 'showProfitMargin', label: 'Profit Margin' },
                                        { key: 'showTotalValue', label: 'Total Value' },
                                        { key: 'showProductionDate', label: 'Production Date' }
                                    ].map(col => (
                                        <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={columnVisibility[col.key]}
                                                onChange={(e) => {
                                                    setColumnVisibility({ ...columnVisibility, [col.key]: e.target.checked });
                                                    setHasChanges(true);
                                                }}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 1: SRP Pricing */}
                    {activeTab === 1 && (
                        <div>
                            <h3 className="mb-4">SRP Pricing</h3>
                            <p className="text-secondary mb-6">Set suggested retail prices for each product type</p>

                            <div className="form-card p-6">
                                <div className="flex flex-col gap-4">
                                    {PRODUCT_TYPES.map(({ key, label }) => (
                                        <div key={key} className="threshold-item">
                                            <label className="threshold-label">{label}</label>
                                            <div className="threshold-input-wrapper">
                                                <span className="currency-symbol">₱</span>
                                                <input
                                                    type="number"
                                                    value={srpPrices[key] || 0}
                                                    onChange={(e) => {
                                                        setSRPPrices({ ...srpPrices, [key]: parseInt(e.target.value) || 0 });
                                                        setHasChanges(true);
                                                    }}
                                                    className="premium-input text-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Cost of Goods */}
                    {activeTab === 2 && (
                        <div>
                            <h3 className="mb-4">Cost of Goods</h3>
                            <p className="text-secondary mb-6">Set production costs for each product type</p>

                            <div className="form-card p-6">
                                <div className="flex flex-col gap-4">
                                    {PRODUCT_TYPES.map(({ key, label }) => (
                                        <div key={key} className="threshold-item">
                                            <label className="threshold-label">{label}</label>
                                            <div className="threshold-input-wrapper">
                                                <span className="currency-symbol">₱</span>
                                                <input
                                                    type="number"
                                                    value={cogsPrices[key] || 0}
                                                    onChange={(e) => {
                                                        setCOGSPrices({ ...cogsPrices, [key]: parseInt(e.target.value) || 0 });
                                                        setHasChanges(true);
                                                    }}
                                                    className="premium-input text-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Adjustment Reasons */}
                    {activeTab === 3 && (
                        <div>
                            <h3 className="mb-4">Stock Adjustment Reasons</h3>
                            <p className="text-secondary mb-6">Manage reasons for manual stock adjustments</p>

                            <div className="form-card p-6">
                                <div className="flex flex-col gap-3 mb-4">
                                    {adjustmentReasons.map((reason, index) => (
                                        <div key={reason.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '0.75rem',
                                            background: 'var(--gray-50)',
                                            borderRadius: 'var(--radius-md)'
                                        }}>
                                            <GripVertical size={16} className="text-secondary" />
                                            {editingReason === reason.id ? (
                                                <input
                                                    type="text"
                                                    defaultValue={reason.reason_text}
                                                    onBlur={(e) => updateAdjustmentReason(reason.id, e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            updateAdjustmentReason(reason.id, e.target.value);
                                                        }
                                                    }}
                                                    className="premium-input"
                                                    style={{ flex: 1 }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span style={{ flex: 1 }}>{reason.reason_text}</span>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingReason(reason.id)}
                                                    className="icon-btn text-primary small-btn"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteAdjustmentReason(reason.id)}
                                                    className="icon-btn text-danger small-btn"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {isAddingReason ? (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={newReasonText}
                                            onChange={(e) => setNewReasonText(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') addAdjustmentReason();
                                            }}
                                            placeholder="Enter reason..."
                                            className="premium-input"
                                            style={{ flex: 1 }}
                                            autoFocus
                                        />
                                        <button onClick={addAdjustmentReason} className="submit-btn">
                                            <Save size={16} />
                                        </button>
                                        <button onClick={() => { setIsAddingReason(false); setNewReasonText(''); }} className="icon-btn">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsAddingReason(true)} className="submit-btn w-full justify-center">
                                        <Plus size={16} className="mr-2" />
                                        Add New Reason
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Low Stock Thresholds */}
                    {activeTab === 4 && (
                        <div>
                            <h3 className="mb-4">Low Stock Thresholds</h3>
                            <p className="text-secondary mb-6">Set minimum stock levels for each SKU</p>

                            <div className="form-card p-4">
                                <input
                                    type="text"
                                    placeholder="Search SKU or Description..."
                                    value={thresholdSearch}
                                    onChange={(e) => setThresholdSearch(e.target.value)}
                                    className="premium-input mb-4"
                                />

                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {filteredInventory.map(item => (
                                        <div key={item.sku} className="threshold-item mb-3">
                                            <div style={{ flex: 1 }}>
                                                <div className="font-medium">{item.sku}</div>
                                                <div className="text-secondary text-sm">{item.description}</div>
                                            </div>
                                            <div className="threshold-input-wrapper" style={{ width: '120px' }}>
                                                <input
                                                    type="number"
                                                    value={thresholds[item.sku] || 0}
                                                    onChange={(e) => {
                                                        setThresholds({ ...thresholds, [item.sku]: parseInt(e.target.value) || 0 });
                                                        setHasChanges(true);
                                                    }}
                                                    className="premium-input text-right"
                                                    placeholder="Min"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Export Settings */}
                    {activeTab === 5 && (
                        <div>
                            <h3 className="mb-4">Export Settings</h3>
                            <p className="text-secondary mb-6">Configure export format and report settings</p>

                            <div className="form-card p-6">
                                <h4 className="mb-3">Format</h4>
                                <div className="flex gap-4 mb-6">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="exportFormat"
                                            value="excel"
                                            checked={exportSettings.format === 'excel'}
                                            onChange={(e) => setExportSettings({ ...exportSettings, format: e.target.value })}
                                        />
                                        <span>Excel (.xlsx)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="exportFormat"
                                            value="csv"
                                            checked={exportSettings.format === 'csv'}
                                            onChange={(e) => setExportSettings({ ...exportSettings, format: e.target.value })}
                                        />
                                        <span>CSV (.csv)</span>
                                    </label>
                                </div>

                                <h4 className="mb-3">Report Header</h4>
                                <div className="flex flex-col gap-3 mb-6">
                                    <div>
                                        <label className="text-sm text-secondary mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            value={exportSettings.companyName}
                                            onChange={(e) => setExportSettings({ ...exportSettings, companyName: e.target.value })}
                                            className="premium-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-secondary mb-1">Report Title</label>
                                        <input
                                            type="text"
                                            value={exportSettings.reportTitle}
                                            onChange={(e) => setExportSettings({ ...exportSettings, reportTitle: e.target.value })}
                                            className="premium-input"
                                        />
                                    </div>
                                </div>

                                <h4 className="mb-3">Include in Export</h4>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { key: 'sku', label: 'SKU' },
                                        { key: 'description', label: 'Description' },
                                        { key: 'stock', label: 'Current Stock' },
                                        { key: 'srp', label: 'SRP' },
                                        { key: 'cogs', label: 'Cost of Goods' },
                                        { key: 'productionDate', label: 'Production Date' }
                                    ].map(col => (
                                        <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={exportSettings.includeColumns[col.key]}
                                                onChange={(e) => setExportSettings({
                                                    ...exportSettings,
                                                    includeColumns: {
                                                        ...exportSettings.includeColumns,
                                                        [col.key]: e.target.checked
                                                    }
                                                })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            <span>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Save Button */}
                {hasChanges && (
                    <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem' }}>
                        <button onClick={handleSave} className="submit-btn w-full justify-center">
                            <Save size={20} className="mr-2" />
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FTFSettingsModal;
