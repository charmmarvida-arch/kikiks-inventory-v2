import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Settings, Plus, X, Save, Trash2, Edit2, Search, Tag, Check } from 'lucide-react';

const TransferLocation = () => {
    const {
        inventory,
        kikiksLocations,
        addKikiksLocation,
        updateKikiksLocation,
        deleteKikiksLocation,
        locationSRPs,
        updateLocationSRP,
        updateLocationCategoryPrices,
        addTransferOrder
    } = useInventory();

    // Form State
    const [selectedLocation, setSelectedLocation] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Order State
    const [quantities, setQuantities] = useState({});
    const [focusedSku, setFocusedSku] = useState(null);

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');

    // Renaming State
    const [renamingLocation, setRenamingLocation] = useState(null);
    const [tempRenameName, setTempRenameName] = useState('');

    // Price Editing State in Settings
    const [editingPriceLocation, setEditingPriceLocation] = useState('');
    const [tempPrices, setTempPrices] = useState({});

    const handleQuantityChange = (sku, value) => {
        setQuantities(prev => ({
            ...prev,
            [sku]: value === '' ? '' : parseInt(value) || 0
        }));
    };

    const getPrice = (location, sku) => {
        if (!location) return 0;
        return locationSRPs[location]?.[sku] || 0;
    };

    const calculateTotal = () => {
        return inventory.reduce((total, item) => {
            const qty = quantities[item.sku] || 0;
            const price = getPrice(selectedLocation, item.sku);
            return total + (qty * price);
        }, 0);
    };

    const currentTotal = calculateTotal();

    const handleSettingsClick = () => {
        const password = prompt("Enter Admin Password:");
        if (password === "1234") {
            setIsSettingsOpen(true);
        } else if (password !== null) {
            alert("Incorrect Password");
        }
    };

    const handleAddLocation = (e) => {
        e.preventDefault();
        if (newLocationName) {
            addKikiksLocation(newLocationName);
            setNewLocationName('');
        }
    };

    const startRenaming = (loc) => {
        setRenamingLocation(loc);
        setTempRenameName(loc);
    };

    const saveRename = async () => {
        if (tempRenameName && tempRenameName !== renamingLocation) {
            await updateKikiksLocation(renamingLocation, tempRenameName);
        }
        setRenamingLocation(null);
        setTempRenameName('');
    };

    const cancelRename = () => {
        setRenamingLocation(null);
        setTempRenameName('');
    };

    const handlePriceChange = (sku, value) => {
        setTempPrices(prev => ({ ...prev, [sku]: value }));
    };

    const savePrices = () => {
        if (editingPriceLocation) {
            Object.entries(tempPrices).forEach(([sku, price]) => {
                updateLocationSRP(editingPriceLocation, sku, price);
            });
            alert(`Prices updated for ${editingPriceLocation}`);
            setTempPrices({});
        }
    };

    // Filter and Sort inventory
    const filteredInventory = inventory.filter(item => {
        // Search filter
        const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Location filter
        if (!selectedLocation) return true;
        if (item.locations && item.locations.length > 0) {
            return item.locations.includes(selectedLocation);
        }
        return true;
    }).sort((a, b) => {
        const priority = { 'FGC': 1, 'FGP': 2, 'FGL': 3, 'FGG': 4, 'FGT': 5, 'FT': 5 };
        const getPrefix = (sku) => sku.split('-')[0];
        const pA = priority[getPrefix(a.sku)] || 99;
        const pB = priority[getPrefix(b.sku)] || 99;
        if (pA !== pB) return pA - pB;
        return a.sku.localeCompare(b.sku);
    });

    const handleSubmitOrder = async () => {
        if (!selectedLocation) {
            alert("Please select a location.");
            return;
        }

        const orderItems = {};
        let hasItems = false;

        inventory.forEach(item => {
            const qty = quantities[item.sku] || 0;
            if (qty > 0) {
                orderItems[item.sku] = qty;
                hasItems = true;
            }
        });

        if (!hasItems) {
            alert("Please add at least one item to the transfer.");
            return;
        }

        const newOrder = {
            resellerName: selectedLocation, // Using location as reseller name for consistency
            location: selectedLocation,
            items: orderItems,
            totalAmount: currentTotal,
            status: 'Pending',
            type: 'Transfer'
        };

        await addTransferOrder(newOrder);
        alert("Transfer Order Submitted Successfully!");

        // Reset
        setQuantities({});
        setSelectedLocation('');
    };

    return (
        <div className="fade-in">
            <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Transfer Location</h2>
                    <p className="page-subtitle">Create stock transfer to company locations</p>
                </div>
                <button onClick={handleSettingsClick} className="icon-btn" title="Location Settings">
                    <Settings size={20} />
                </button>
            </div>

            {/* Header Info Card */}
            <div className="form-card">
                <div className="form-grid two-cols">
                    <div className="form-group">
                        <label>Kikiks Location</label>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="premium-input"
                        >
                            <option value="">Select Location</option>
                            {kikiksLocations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Date</label>
                        <div className="read-only-field premium-input">
                            {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: Split View */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>

                {/* LEFT: Product List */}
                <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
                    <div className="form-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                            <h3 className="card-heading" style={{ fontSize: '1rem', marginBottom: 0, border: 'none', padding: 0 }}>Select Products</h3>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        padding: '0.3rem 0.6rem 0.3rem 2rem',
                                        fontSize: '0.8rem',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        outline: 'none',
                                        width: '200px'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="table-container" style={{ flex: 1, overflowY: 'auto', margin: 0, borderRadius: 0, border: 'none' }}>
                            <table className="inventory-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={{ width: '120px' }}>SKU</th>
                                        <th>Description</th>
                                        <th style={{ width: '80px' }}>UOM</th>
                                        <th style={{ width: '100px' }}>Quantity</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Price</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.map(item => {
                                        const price = getPrice(selectedLocation, item.sku);
                                        const qty = quantities[item.sku] || 0;
                                        const total = qty * price;
                                        const isSelected = qty > 0;

                                        return (
                                            <tr key={item.sku} style={{ backgroundColor: isSelected ? 'var(--primary-subtle)' : 'inherit' }}>
                                                <td className="font-medium">{item.sku}</td>
                                                <td>{item.description}</td>
                                                <td>{item.uom}</td>
                                                <td>
                                                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={quantities[item.sku] || ''}
                                                            onChange={(e) => handleQuantityChange(item.sku, e.target.value)}
                                                            placeholder="0"
                                                            className="premium-input"
                                                            style={{
                                                                padding: '0.25rem 0.5rem',
                                                                height: '32px',
                                                                borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                                                                width: '100%'
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                position: 'absolute',
                                                                right: '5px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                fontSize: '0.7rem',
                                                                color: 'var(--text-secondary)',
                                                                backgroundColor: 'rgba(0,0,0,0.05)',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                pointerEvents: 'none',
                                                                opacity: 0.7
                                                            }}
                                                            title="Current Stock"
                                                        >
                                                            {item.quantity}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-right">₱{price.toLocaleString()}</td>
                                                <td className="text-right font-bold">
                                                    {total > 0 ? `₱${total.toLocaleString()}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Order Summary */}
                <div style={{ flex: '0 0 350px', position: 'sticky', top: '1rem' }}>
                    <div className="form-card">
                        <h3 className="card-heading">Transfer Summary</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Items</span>
                                <span className="font-medium">
                                    {Object.values(quantities).reduce((a, b) => a + (b > 0 ? 1 : 0), 0)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Quantity</span>
                                <span className="font-medium">
                                    {Object.values(quantities).reduce((a, b) => a + (parseInt(b) || 0), 0)}
                                </span>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Total Value</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                                    ₱{currentTotal.toLocaleString()}
                                </span>
                            </div>

                            <button
                                onClick={handleSubmitOrder}
                                className="submit-btn"
                                style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                            >
                                <Save size={18} />
                                Submit Transfer
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                    <div className="modal-content large-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Location Settings</h2>
                            <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex' }}>

                            {/* LEFT PANEL: Locations List */}
                            <div style={{ width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Locations</h3>
                                    <form onSubmit={handleAddLocation} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newLocationName}
                                            onChange={(e) => setNewLocationName(e.target.value)}
                                            placeholder="New Location Name"
                                            className="premium-input flex-1 text-sm"
                                            required
                                        />
                                        <button type="submit" className="icon-btn bg-primary text-white hover:bg-primary-dark">
                                            <Plus size={18} />
                                        </button>
                                    </form>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {kikiksLocations.map(loc => (
                                        <div
                                            key={loc}
                                            onClick={() => {
                                                setEditingPriceLocation(loc);
                                                // Initialize temp prices based on first item found for each category
                                                // or just 0 if not found.
                                                // We need to find ONE item of each prefix to get the current price.
                                                const currentPrices = {};
                                                ['FGC', 'FGP', 'FGL', 'FGG', 'FGT'].forEach(prefix => {
                                                    // Find an item with this prefix
                                                    const item = inventory.find(i => i.sku.startsWith(prefix));
                                                    if (item) {
                                                        currentPrices[prefix] = locationSRPs[loc]?.[item.sku] || 0;
                                                    } else {
                                                        currentPrices[prefix] = 0;
                                                    }
                                                });
                                                setTempPrices(currentPrices);
                                            }}
                                            className={`p-3 border-b border-gray-100 cursor-pointer flex justify-between items-center hover:bg-gray-100 transition-colors ${editingPriceLocation === loc ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}
                                        >
                                            {renamingLocation === loc ? (
                                                <div className="flex gap-1 flex-1 mr-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={tempRenameName}
                                                        onChange={(e) => setTempRenameName(e.target.value)}
                                                        className="premium-input py-1 px-2 text-sm w-full"
                                                        autoFocus
                                                    />
                                                    <button onClick={saveRename} className="icon-btn text-green-600"><Check size={14} /></button>
                                                    <button onClick={cancelRename} className="icon-btn text-red-600"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <span className={`font-medium ${editingPriceLocation === loc ? 'text-primary' : 'text-gray-700'}`}>{loc}</span>
                                            )}

                                            {!renamingLocation && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startRenaming(loc); }}
                                                        className="icon-btn small-btn text-blue-600 hover:bg-blue-50"
                                                        title="Rename"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteKikiksLocation(loc); }}
                                                        className="icon-btn small-btn text-red-600 hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* RIGHT PANEL: Configuration */}
                            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: '#fff' }}>
                                {editingPriceLocation ? (
                                    <div className="max-w-md mx-auto">
                                        <div className="mb-6 pb-4 border-b border-gray-100">
                                            <h3 className="text-xl font-bold text-gray-800 mb-1">{editingPriceLocation}</h3>
                                            <p className="text-gray-500 text-sm">Configure pricing for this location</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <Tag size={16} /> Product Pricing
                                                </h4>
                                                <div className="grid gap-4">
                                                    {[
                                                        { key: 'FGC', label: 'Cup (FGC)' },
                                                        { key: 'FGP', label: 'Pint (FGP)' },
                                                        { key: 'FGL', label: 'Liter (FGL)' },
                                                        { key: 'FGG', label: 'Gallon (FGG)' },
                                                        { key: 'FGT', label: 'Tray (FGT)' }
                                                    ].map(({ key, label }) => (
                                                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <label className="font-medium text-gray-700">{label}</label>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-400 font-medium">₱</span>
                                                                <input
                                                                    type="number"
                                                                    value={tempPrices[key] || 0}
                                                                    onChange={(e) => handlePriceChange(key, e.target.value)}
                                                                    className="premium-input text-right font-bold text-gray-900"
                                                                    style={{ width: '100px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <button
                                                    onClick={() => {
                                                        // Use the new bulk update function
                                                        updateLocationCategoryPrices(editingPriceLocation, tempPrices);
                                                        alert(`Prices updated for ${editingPriceLocation}`);
                                                    }}
                                                    className="submit-btn"
                                                    style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                                                >
                                                    <Save size={18} className="mr-2" />
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <Settings size={32} />
                                        </div>
                                        <p className="text-lg font-medium">Select a location to configure</p>
                                        <p className="text-sm">Choose a location from the list on the left</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransferLocation;
