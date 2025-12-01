
import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
    Users, Map, Box, Tag, X, Plus, Search,
    Edit2, Trash2, Check, Eye, EyeOff, Save,
    AlertCircle
} from 'lucide-react';

const ResellerSettingsModal = ({ isOpen, onClose }) => {
    const {
        resellers, addReseller, updateReseller, deleteReseller,
        resellerZones, addResellerZone, updateResellerZone, deleteResellerZone,
        inventory, toggleSkuVisibility,
        zonePrices, updateZonePrice
    } = useInventory();

    const [activeTab, setActiveTab] = useState('resellers');

    // Reseller State
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingReseller, setIsAddingReseller] = useState(false);
    const [newReseller, setNewReseller] = useState({ name: '', zone_id: '' });

    // Zone State
    const [editingZoneId, setEditingZoneId] = useState(null);
    const [tempZone, setTempZone] = useState({});
    const [isAddingZone, setIsAddingZone] = useState(false);
    const [newZone, setNewZone] = useState({ name: '', minimum_order_value: 0 });

    // SKU State
    const [skuSearch, setSkuSearch] = useState('');

    // Price State
    const [selectedZoneForPricing, setSelectedZoneForPricing] = useState('default'); // 'default' or zoneId
    // We don't need tempPrices state anymore, we can read directly from context or use a local buffer if we want "Save All" behavior.
    // For "Save All" behavior, we can keep a local state that initializes when zone changes.
    const [localPrices, setLocalPrices] = useState({
        'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 1000
    });

    // Effect to update local prices when zone selection changes
    React.useEffect(() => {
        if (selectedZoneForPricing === 'default') {
            // Reset to defaults or global settings (if we had them)
            setLocalPrices({ 'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 1000 });
        } else {
            // Load prices for this zone
            const currentZonePrices = zonePrices[selectedZoneForPricing] || {};
            setLocalPrices({
                'FGC': currentZonePrices['FGC'] || 23,
                'FGP': currentZonePrices['FGP'] || 85,
                'FGL': currentZonePrices['FGL'] || 170,
                'FGG': currentZonePrices['FGG'] || 680,
                'FGT': currentZonePrices['FGT'] || 1000
            });
        }
    }, [selectedZoneForPricing, zonePrices]);

    const handleSavePrices = async () => {
        if (selectedZoneForPricing === 'default') {
            alert("Editing Global Default prices is not yet supported. Please select a specific Zone.");
            return;
        }

        // Save each category price
        for (const [prefix, price] of Object.entries(localPrices)) {
            await updateZonePrice(selectedZoneForPricing, prefix, price);
        }
        alert("Prices updated for selected zone!");
    };

    if (!isOpen) return null;

    // --- Reseller Handlers ---
    const handleAddReseller = async (e) => {
        e.preventDefault();
        if (!newReseller.name || !newReseller.zone_id) {
            alert("Name and Zone are required");
            return;
        }
        await addReseller(newReseller);
        setNewReseller({ name: '', zone_id: '' });
        setIsAddingReseller(false);
    };

    const handleUpdateResellerZone = (resellerId, zoneId) => {
        updateReseller(resellerId, { zone_id: zoneId });
    };

    // --- Zone Handlers ---
    const handleAddZone = async (e) => {
        e.preventDefault();
        await addResellerZone(newZone);
        setNewZone({ name: '', minimum_order_value: 0 });
        setIsAddingZone(false);
    };

    const startEditZone = (zone) => {
        setEditingZoneId(zone.id);
        setTempZone(zone);
    };

    const saveZone = async () => {
        await updateResellerZone(editingZoneId, {
            name: tempZone.name,
            minimum_order_value: Number(tempZone.minimum_order_value)
        });
        setEditingZoneId(null);
    };

    // --- SKU Handlers ---
    const filteredInventory = inventory.filter(item =>
        item.sku.toLowerCase().includes(skuSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(skuSearch.toLowerCase())
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', height: '700px', padding: 0 }}>

                <div className="settings-container">
                    {/* Sidebar */}
                    <div className="settings-sidebar">
                        <div className="settings-sidebar-header">
                            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-main)' }}>Settings</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Command Center</p>
                        </div>
                        <div className="settings-nav">
                            {[
                                { id: 'resellers', label: 'Resellers', icon: Users },
                                { id: 'zones', label: 'Area/Type', icon: Map },
                                { id: 'sku', label: 'Products (SKU)', icon: Box },
                                { id: 'price', label: 'Pricing', icon: Tag },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`settings-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="settings-main">
                        <div className="settings-header">
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                    {activeTab === 'sku' ? 'Product Management' : activeTab}
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Manage your {activeTab === 'sku' ? 'products' : activeTab} settings
                                </p>
                            </div>
                            <button onClick={onClose} className="icon-btn" style={{ border: 'none' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="settings-content">

                            {/* --- RESELLERS TAB --- */}
                            {activeTab === 'resellers' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="settings-toolbar">
                                        <div className="settings-search-wrapper">
                                            <Search size={16} className="settings-search-icon" />
                                            <input
                                                type="text"
                                                placeholder="Search resellers..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="settings-search-input"
                                            />
                                        </div>
                                        <button onClick={() => setIsAddingReseller(true)} className="submit-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                                            <Plus size={16} style={{ marginRight: '0.25rem' }} /> Add Reseller
                                        </button>
                                    </div>

                                    {isAddingReseller && (
                                        <div className="slide-down-form">
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>New Reseller</h4>
                                            <form onSubmit={handleAddReseller} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Name</label>
                                                    <input
                                                        type="text"
                                                        value={newReseller.name}
                                                        onChange={e => setNewReseller({ ...newReseller, name: e.target.value })}
                                                        className="premium-input"
                                                        placeholder="Store Name"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Area/Type</label>
                                                    <select
                                                        value={newReseller.zone_id}
                                                        onChange={e => setNewReseller({ ...newReseller, zone_id: e.target.value })}
                                                        className="premium-input"
                                                        style={{ width: '100%' }}
                                                    >
                                                        <option value="">Select Area/Type</option>
                                                        {resellerZones.map(z => (
                                                            <option key={z.id} value={z.id}>{z.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button type="submit" className="submit-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                                                <button type="button" onClick={() => setIsAddingReseller(false)} className="icon-btn" style={{ width: '38px', height: '38px' }}><X size={20} /></button>
                                            </form>
                                        </div>
                                    )}

                                    <div className="settings-card">
                                        <table className="settings-table">
                                            <thead>
                                                <tr>
                                                    <th>Reseller Name</th>
                                                    <th>Area/Type</th>
                                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {resellers.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
                                                    <tr key={r.id}>
                                                        <td style={{ fontWeight: '500' }}>{r.name}</td>
                                                        <td>
                                                            <select
                                                                value={r.zone_id || ''}
                                                                onChange={(e) => handleUpdateResellerZone(r.id, e.target.value)}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: 'var(--text-secondary)',
                                                                    fontWeight: '500',
                                                                    cursor: 'pointer',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <option value="">No Area/Type</option>
                                                                {resellerZones.map(z => (
                                                                    <option key={z.id} value={z.id}>{z.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => { if (confirm('Delete reseller?')) deleteReseller(r.id) }}
                                                                className="icon-btn"
                                                                style={{ border: 'none', color: 'var(--danger)', display: 'inline-flex' }}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* --- ZONES TAB --- */}
                            {activeTab === 'zones' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setIsAddingZone(true)} className="submit-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                                            <Plus size={16} style={{ marginRight: '0.25rem' }} /> Add Area/Type
                                        </button>
                                    </div>

                                    {isAddingZone && (
                                        <div className="slide-down-form">
                                            <form onSubmit={handleAddZone} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 2 }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Area/Type Name</label>
                                                    <input
                                                        type="text"
                                                        value={newZone.name}
                                                        onChange={e => setNewZone({ ...newZone, name: e.target.value })}
                                                        className="premium-input"
                                                        placeholder="e.g. Sorsogon City"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Min Order (₱)</label>
                                                    <input
                                                        type="number"
                                                        value={newZone.minimum_order_value}
                                                        onChange={e => setNewZone({ ...newZone, minimum_order_value: e.target.value })}
                                                        className="premium-input"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <button type="submit" className="submit-btn" style={{ padding: '0.5rem 1rem' }}>Save</button>
                                                <button type="button" onClick={() => setIsAddingZone(false)} className="icon-btn" style={{ width: '38px', height: '38px' }}><X size={20} /></button>
                                            </form>
                                        </div>
                                    )}

                                    <div className="zone-grid">
                                        {resellerZones.map(zone => (
                                            <div key={zone.id} className="zone-card">
                                                {editingZoneId === zone.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        <input
                                                            type="text"
                                                            value={tempZone.name}
                                                            onChange={e => setTempZone({ ...tempZone, name: e.target.value })}
                                                            className="premium-input"
                                                            style={{ width: '100%' }}
                                                        />
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ color: 'var(--text-muted)' }}>₱</span>
                                                            <input
                                                                type="number"
                                                                value={tempZone.minimum_order_value}
                                                                onChange={e => setTempZone({ ...tempZone, minimum_order_value: e.target.value })}
                                                                className="premium-input"
                                                                style={{ width: '100%', fontWeight: 'bold', color: 'var(--primary)' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                            <button onClick={saveZone} className="icon-btn" style={{ color: 'var(--success)' }}><Check size={18} /></button>
                                                            <button onClick={() => setEditingZoneId(null)} className="icon-btn" style={{ color: 'var(--danger)' }}><X size={18} /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                            <h4 style={{ fontWeight: '700', color: 'var(--text-main)' }}>{zone.name}</h4>
                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                <button onClick={() => startEditZone(zone)} className="icon-btn" style={{ width: '28px', height: '28px', border: 'none' }}><Edit2 size={14} /></button>
                                                                <button onClick={() => { if (confirm('Delete Area/Type?')) deleteResellerZone(zone.id) }} className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min Order</span>
                                                            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>₱{zone.minimum_order_value?.toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            <Users size={12} />
                                                            <span>{resellers.filter(r => r.zone_id === zone.id).length} Resellers Linked</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- SKU TAB --- */}
                            {activeTab === 'sku' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="settings-toolbar">
                                        <div className="settings-search-wrapper" style={{ maxWidth: '100%' }}>
                                            <Search size={16} className="settings-search-icon" />
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={skuSearch}
                                                onChange={(e) => setSkuSearch(e.target.value)}
                                                className="settings-search-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="settings-card">
                                        <table className="settings-table">
                                            <thead>
                                                <tr>
                                                    <th>SKU</th>
                                                    <th>Description</th>
                                                    <th style={{ textAlign: 'center' }}>Visibility</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredInventory.map(item => (
                                                    <tr key={item.sku}>
                                                        <td style={{ fontWeight: '500' }}>{item.sku}</td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{item.description}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => toggleSkuVisibility(item.sku, !(item.isVisible !== false))}
                                                                className={`visibility-badge ${item.isVisible !== false ? 'visible' : 'not-visible'}`}
                                                            >
                                                                {item.isVisible !== false ? (
                                                                    <><Eye size={12} /> Visible</>
                                                                ) : (
                                                                    <><EyeOff size={12} /> Hidden</>
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* --- PRICE TAB --- */}
                            {activeTab === 'price' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    {/* Zone Selector for Pricing */}
                                    <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                            Select Area/Type to Edit Prices
                                        </label>
                                        <select
                                            value={selectedZoneForPricing}
                                            onChange={(e) => setSelectedZoneForPricing(e.target.value)}
                                            className="premium-input"
                                            style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                                        >
                                            <option value="default">Global Defaults (Read Only)</option>
                                            {resellerZones.map(z => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <AlertCircle size={20} style={{ color: '#2563eb', marginTop: '2px' }} />
                                        <div>
                                            <h4 style={{ fontWeight: '600', color: '#1e40af', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Bulk Price Update</h4>
                                            <p style={{ color: '#1e3a8a', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                                {selectedZoneForPricing === 'default'
                                                    ? "Viewing default base prices. Select a specific Area/Type above to customize prices for that area."
                                                    : "Updating a price here will apply to ALL products in this category for the selected Area/Type."}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                                        {[
                                            { key: 'FGC', label: 'Cup (FGC)' },
                                            { key: 'FGP', label: 'Pint (FGP)' },
                                            { key: 'FGL', label: 'Liter (FGL)' },
                                            { key: 'FGG', label: 'Gallon (FGG)' },
                                            { key: 'FGT', label: 'Tray (FGT)' }
                                        ].map(({ key, label }) => (
                                            <div key={key} className="price-row">
                                                <div>
                                                    <label style={{ fontWeight: '700', color: 'var(--text-main)', display: 'block' }}>{label}</label>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {inventory.filter(i => i.sku.startsWith(key)).length} Products Linked
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>₱</span>
                                                    <input
                                                        type="number"
                                                        value={localPrices[key] || 0}
                                                        onChange={(e) => setLocalPrices({ ...localPrices, [key]: e.target.value })}
                                                        className="premium-input"
                                                        style={{ width: '100px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.125rem' }}
                                                        disabled={selectedZoneForPricing === 'default'}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedZoneForPricing !== 'default' && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                                            <button
                                                onClick={handleSavePrices}
                                                className="submit-btn"
                                                style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                                            >
                                                <Save size={18} style={{ marginRight: '0.5rem' }} />
                                                Save Prices for Area/Type
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResellerSettingsModal;
