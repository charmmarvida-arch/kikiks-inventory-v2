import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { supabase } from '../supabaseClient';
import { Settings, Save, Search, Info } from 'lucide-react';
import ResellerSettingsModal from './ResellerSettingsModal';
import { useNavigate } from 'react-router-dom';

// Default Base Prices (Fallback)
const BASE_PRICES = {
    'FGC': 23,
    'FGP': 85,
    'FGL': 170,
    'FGG': 680,
    'FGT': 1000
};

const PRODUCT_CATEGORIES = [
    { id: 'FGC', label: 'Cups' },
    { id: 'FGP', label: 'Pints' },
    { id: 'FGL', label: 'Liters' },
    { id: 'FGG', label: 'Gallons' },
    { id: 'FGT', label: 'Trays' }
];

const ResellerOrder = ({ isPublic = false }) => {
    const { inventory, resellers, addResellerOrder, resellerZones, resellerPrices, zonePrices } = useInventory();
    const navigate = useNavigate();

    // Form State
    const [selectedResellerId, setSelectedResellerId] = useState('');
    const [address, setAddress] = useState('');
    const [activeCategoryTab, setActiveCategoryTab] = useState('FGC');
    const [searchTerm, setSearchTerm] = useState('');

    // Order State
    const [quantities, setQuantities] = useState({});

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Derived State
    const selectedReseller = resellers.find(r => String(r.id) === String(selectedResellerId));
    const currentZone = selectedReseller ? resellerZones.find(z => z.id === selectedReseller.zone_id) : null;

    const handleSettingsClick = () => {
        const password = prompt("Enter Admin Password:");
        if (password === "1234") {
            setIsSettingsOpen(true);
        } else if (password !== null) {
            alert("Incorrect Password");
        }
    };

    const handleQuantityChange = (sku, value) => {
        setQuantities(prev => ({
            ...prev,
            [sku]: value === '' ? '' : parseInt(value) || 0
        }));
    };

    const getPrice = (sku) => {
        const prefix = sku.split('-')[0];

        // 1. Check Zone-Specific Price
        if (currentZone && zonePrices[currentZone.id] && zonePrices[currentZone.id][prefix]) {
            return zonePrices[currentZone.id][prefix];
        }

        // 2. Fallback to Global Reseller Prices (from App Settings)
        if (resellerPrices[prefix]) {
            return resellerPrices[prefix];
        }

        // 3. Fallback to Hardcoded Base Prices
        return BASE_PRICES[prefix] || 0;
    };

    const calculateTotal = () => {
        return inventory.reduce((total, item) => {
            const qty = quantities[item.sku] || 0;
            const price = getPrice(item.sku);
            return total + (qty * price);
        }, 0);
    };

    const calculateCategorySubtotal = (prefix) => {
        return inventory
            .filter(item => item.sku.startsWith(prefix))
            .reduce((total, item) => {
                const qty = quantities[item.sku] || 0;
                const price = getPrice(item.sku);
                return total + (qty * price);
            }, 0);
    };

    const handleSubmitOrder = async () => {
        if (!selectedResellerId) {
            alert('Please select a reseller.');
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
            alert('Please add at least one item to the order.');
            return;
        }

        const totalAmount = calculateTotal();
        const minThreshold = currentZone ? currentZone.minimum_order_value : 0;

        if (totalAmount < minThreshold) {
            alert(`Order Failed: The minimum order requirement for ${currentZone.name} is ₱${minThreshold.toLocaleString()}. Your current total is ₱${totalAmount.toLocaleString()}.`);
            return;
        }

        const orderData = {
            resellerId: selectedResellerId,
            resellerName: selectedReseller.name,
            location: currentZone ? currentZone.name : 'Unknown Area/Type', // Store Area/Type Name for history
            address: address,
            items: orderItems,
            totalAmount: totalAmount,
            date: new Date().toISOString(),
            status: 'Pending'
        };

        await addResellerOrder(orderData);

        // Success & Redirect
        alert('Order Submitted Successfully! Redirecting to Packing List...');
        navigate('/reseller-orders-list'); // Fallback for now, ideally would open PDF

        // Reset form
        setQuantities({});
        setSelectedResellerId('');
        setAddress('');
    };

    // Filter Inventory based on Active Tab and Search
    // Also filter by 'isVisible' flag
    const filteredInventory = inventory
        .filter(item => item.isVisible !== false) // Only show visible items
        .filter(item => item.sku.startsWith(activeCategoryTab)) // Filter by Category Tab
        .filter(item =>
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="fade-in">
            <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Create Reseller Order</h2>
                    <p className="page-subtitle">New order entry</p>
                </div>
                {!isPublic && (
                    <button onClick={handleSettingsClick} className="icon-btn" title="Reseller Settings">
                        <Settings size={20} />
                    </button>
                )}
            </div>

            {/* Header Info Card */}
            <div className="form-card">
                <div className="form-grid three-cols">
                    <div className="form-group">
                        <label>Reseller Name</label>
                        <select
                            value={selectedResellerId}
                            onChange={(e) => setSelectedResellerId(e.target.value)}
                            className="premium-input"
                        >
                            <option value="">Select Reseller</option>
                            {resellers.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Area/Type</label>
                        <div className="read-only-field premium-input">
                            {currentZone ? (
                                <span className="flex items-center gap-2">
                                    {currentZone.name}
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        Min: ₱{currentZone.minimum_order_value?.toLocaleString()}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-gray-400">Select a reseller to see Area/Type</span>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Delivery Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter specific address if needed"
                            className="premium-input"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content: Split View */}
            <div className="responsive-split">

                {/* LEFT: Product List */}
                <div className="responsive-col-main">

                    {/* Category Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {PRODUCT_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategoryTab(cat.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeCategoryTab === cat.id
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="form-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                            <h3 className="card-heading" style={{ fontSize: '1rem', marginBottom: 0, border: 'none', padding: 0 }}>
                                Select {PRODUCT_CATEGORIES.find(c => c.id === activeCategoryTab)?.label}
                            </h3>
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
                                        width: '100%',
                                        maxWidth: '200px'
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
                                        const price = getPrice(item.sku);
                                        const qty = quantities[item.sku] || 0;
                                        const total = qty * price;
                                        const isSelected = qty > 0;

                                        return (
                                            <tr key={item.sku} style={{ backgroundColor: isSelected ? 'var(--primary-subtle)' : 'inherit' }}>
                                                <td className="font-medium">{item.sku}</td>
                                                <td>{item.description}</td>
                                                <td>{item.uom}</td>
                                                <td>
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
                                                            borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)'
                                                        }}
                                                    />
                                                </td>
                                                <td className="text-right">₱{price.toLocaleString()}</td>
                                                <td className="text-right font-bold">
                                                    {total > 0 ? `₱${total.toLocaleString()}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Subtotal Row */}
                                    <tr className="bg-gray-50 font-bold">
                                        <td colSpan={5} className="text-right py-3">
                                            Total {PRODUCT_CATEGORIES.find(c => c.id === activeCategoryTab)?.label} Amount:
                                        </td>
                                        <td className="text-right py-3 text-primary">
                                            ₱{calculateCategorySubtotal(activeCategoryTab).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Order Summary */}
                <div className="responsive-col-sidebar">
                    <div className="form-card sticky top-4">
                        <h3 className="card-heading">Order Summary</h3>

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
                                <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Grand Total</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                                    ₱{calculateTotal().toLocaleString()}
                                </span>
                            </div>

                            {currentZone && (
                                <div className={`alert-box ${calculateTotal() < currentZone.minimum_order_value ? 'alert-danger' : 'alert-success'}`} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Info size={16} />
                                    <span>
                                        {calculateTotal() < currentZone.minimum_order_value
                                            ? `Minimum for ${currentZone.name}: ₱${currentZone.minimum_order_value.toLocaleString()}`
                                            : `Minimum order met`}
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={handleSubmitOrder}
                                className="submit-btn"
                                style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                            >
                                <Save size={18} />
                                Submit Order
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <ResellerSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

export default ResellerOrder;
