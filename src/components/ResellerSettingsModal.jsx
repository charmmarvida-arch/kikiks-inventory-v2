import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Save } from 'lucide-react';

const ResellerSettingsModal = ({ onClose }) => {
    const { resellerOrders, resellerSettings, updateResellerSetting } = useInventory();

    // Get unique reseller names from all orders
    const uniqueResellers = useMemo(() => {
        const names = new Set(resellerOrders.map(order => order.resellerName));
        return Array.from(names).sort();
    }, [resellerOrders]);

    // Local state for editing
    const [editValues, setEditValues] = useState({});
    const [saving, setSaving] = useState({});

    // Get minimum for a reseller (from settings or default)
    const getMinimum = (resellerName) => {
        if (editValues[resellerName] !== undefined) {
            return editValues[resellerName];
        }
        const setting = resellerSettings.find(s => s.reseller_name === resellerName);
        return setting ? setting.minimum_monthly_order : 10000;
    };

    // Handle input change
    const handleChange = (resellerName, value) => {
        setEditValues(prev => ({
            ...prev,
            [resellerName]: value
        }));
    };

    // Handle save for a specific reseller
    const handleSave = async (resellerName) => {
        const value = editValues[resellerName];
        if (value === undefined || value === '') return;

        setSaving(prev => ({ ...prev, [resellerName]: true }));

        try {
            await updateResellerSetting(resellerName, Number(value));
            // Clear edit value after successful save
            setEditValues(prev => {
                const newValues = { ...prev };
                delete newValues[resellerName];
                return newValues;
            });
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(prev => ({ ...prev, [resellerName]: false }));
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">⚙️ Reseller Minimum Order Settings</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="modal-body">
                    <p className="text-secondary mb-4">
                        Set the minimum monthly order requirement for each reseller. Default is ₱10,000.
                    </p>

                    <div className="scrollable-table-container" style={{ maxHeight: '500px' }}>
                        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                <tr className="text-left text-sm text-secondary" style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Reseller Name</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Minimum Monthly Order (₱)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueResellers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="empty-state">
                                            No resellers found. Create an order first to set minimums.
                                        </td>
                                    </tr>
                                ) : (
                                    uniqueResellers.map((resellerName, index) => (
                                        <tr
                                            key={resellerName}
                                            style={{
                                                borderBottom: index < uniqueResellers.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                                            }}
                                        >
                                            <td style={{ padding: '16px', fontWeight: '500' }}>
                                                {resellerName}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <input
                                                    type="number"
                                                    className="premium-input"
                                                    style={{ maxWidth: '200px' }}
                                                    value={getMinimum(resellerName)}
                                                    onChange={(e) => handleChange(resellerName, e.target.value)}
                                                    min="0"
                                                    step="1000"
                                                />
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => handleSave(resellerName)}
                                                    disabled={saving[resellerName] || editValues[resellerName] === undefined}
                                                    style={{
                                                        opacity: (saving[resellerName] || editValues[resellerName] === undefined) ? 0.5 : 1,
                                                        cursor: (saving[resellerName] || editValues[resellerName] === undefined) ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <Save size={16} />
                                                    {saving[resellerName] ? 'Saving...' : 'Save'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResellerSettingsModal;
