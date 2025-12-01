import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Settings, Search, ShoppingCart,
    Coffee, IceCream, Droplet, Box, Grid,
    ChevronRight, Save, X, Trash2, AlertCircle, FileText
} from 'lucide-react';
import ResellerSettingsModal from './ResellerSettingsModal';

// Category Configuration with Icons and Colors
// Brand Palette:
// Cream: #F3EBD8 (Background)
// Merlot: #510813 (Text/Headings)
// Cinnabar: #E5562E (Buttons/Gallons)
// Citrus: #F49306 (Cups)
// Bittersweet: #FF5A5F (Pints)
// Lush: #888625 (Liters)

const CATEGORIES = [
    { id: 'FGC', label: 'Cups', icon: Coffee, color: 'bg-[#F49306]/10 text-[#F49306]', border: 'border-[#F49306]/20', iconColor: 'text-[#F49306]' },
    { id: 'FGP', label: 'Pints', icon: IceCream, color: 'bg-[#FF5A5F]/10 text-[#FF5A5F]', border: 'border-[#FF5A5F]/20', iconColor: 'text-[#FF5A5F]' },
    { id: 'FGL', label: 'Liters', icon: Droplet, color: 'bg-[#888625]/10 text-[#888625]', border: 'border-[#888625]/20', iconColor: 'text-[#888625]' },
    { id: 'FGG', label: 'Gallons', icon: Box, color: 'bg-[#E5562E]/10 text-[#E5562E]', border: 'border-[#E5562E]/20', iconColor: 'text-[#E5562E]' },
    { id: 'FGT', label: 'Trays', icon: Grid, color: 'bg-[#510813]/10 text-[#510813]', border: 'border-[#510813]/20', iconColor: 'text-[#510813]' }
];

const ResellerOrderRedesigned = ({ isPublic = false }) => {
    const { inventory, resellers, addResellerOrder, updateResellerOrder, resellerOrders, resellerZones, resellerPrices, zonePrices } = useInventory();
    const navigate = useNavigate();
    const { orderId } = useParams();

    // --- State ---
    const [selectedResellerId, setSelectedResellerId] = useState('');
    const [address, setAddress] = useState('');

    // Load Order for Editing
    useEffect(() => {
        if (orderId && resellerOrders.length > 0) {
            const orderToEdit = resellerOrders.find(o => o.id === orderId);
            if (orderToEdit) {
                setSelectedResellerId(orderToEdit.resellerId);
                setAddress(orderToEdit.address || '');
                setCart(orderToEdit.items || {});
            }
        }
    }, [orderId, resellerOrders]);

    // Cart State: { 'SKU-123': 50, 'SKU-456': 10 }
    const [cart, setCart] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [tempQuantities, setTempQuantities] = useState({}); // Buffer for modal inputs
    const [searchTerm, setSearchTerm] = useState('');

    // Settings Modal
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // --- Derived Data ---
    const selectedReseller = resellers.find(r => String(r.id) === String(selectedResellerId));
    const currentZone = selectedReseller ? resellerZones.find(z => z.id === selectedReseller.zone_id) : null;

    // Smart Context: Minimum Order
    const minOrderAmount = currentZone ? currentZone.minimum_order_value : 0;

    // --- Helpers ---
    const getPrice = (sku) => {
        const prefix = sku.split('-')[0];
        // 1. Zone Specific
        if (currentZone && zonePrices[currentZone.id] && zonePrices[currentZone.id][prefix]) {
            return zonePrices[currentZone.id][prefix];
        }
        // 2. Global Reseller
        if (resellerPrices[prefix]) return resellerPrices[prefix];
        // 3. Fallback (Hardcoded for safety)
        const BASE_PRICES = { 'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 1000 };
        return BASE_PRICES[prefix] || 0;
    };

    const calculateTotal = (items = cart) => {
        return Object.entries(items).reduce((total, [sku, qty]) => {
            if (qty <= 0) return total;
            const item = inventory.find(i => i.sku === sku);
            if (!item) return total;
            return total + (qty * getPrice(sku));
        }, 0);
    };

    const cartTotal = calculateTotal(cart);
    const isMinOrderMet = cartTotal >= minOrderAmount;

    // --- Handlers ---
    const handleResellerChange = (e) => {
        const newId = e.target.value;
        setSelectedResellerId(newId);
        setAddress('');
    };

    const handleCategoryClick = (catId) => {
        if (!selectedResellerId) {
            alert("Please select a Reseller first.");
            return;
        }
        setActiveCategory(catId);
        const currentCatItems = {};
        inventory
            .filter(item => item.sku.startsWith(catId))
            .forEach(item => {
                if (cart[item.sku]) {
                    currentCatItems[item.sku] = cart[item.sku];
                }
            });
        setTempQuantities(currentCatItems);
        setSearchTerm('');
        setIsModalOpen(true);
    };

    const handleModalQuantityChange = (sku, val) => {
        const qty = val === '' ? '' : parseInt(val);
        setTempQuantities(prev => ({
            ...prev,
            [sku]: qty
        }));
    };

    const handleSaveModal = () => {
        const newCart = { ...cart };

        Object.keys(newCart).forEach(sku => {
            if (sku.startsWith(activeCategory)) {
                delete newCart[sku];
            }
        });

        Object.entries(tempQuantities).forEach(([sku, qty]) => {
            if (qty > 0) {
                newCart[sku] = qty;
            }
        });

        setCart(newCart);
        setIsModalOpen(false);
    };

    const handleInitialSubmit = () => {
        if (!selectedResellerId) return alert('Select a reseller');
        if (!isMinOrderMet) return alert(`Minimum order of ₱${minOrderAmount.toLocaleString()} not met.`);
        if (Object.keys(cart).length === 0) return alert('Cart is empty');

        // Validation: Cups (FGC) must be divisible by 10
        const fgcItems = Object.entries(cart).filter(([sku]) => sku.startsWith('FGC'));
        for (const [sku, qty] of fgcItems) {
            if (qty % 10 !== 0) {
                return alert(`Order for ${sku} must be in multiples of 10 (e.g., 10, 20, 30). Current: ${qty}`);
            }
        }

        setIsConfirmOpen(true);
    };

    const handleProceedOrder = async () => {
        // Prepare Order Data
        const orderItems = {};
        Object.entries(cart).forEach(([sku, qty]) => {
            if (qty > 0) orderItems[sku] = qty;
        });

        const orderData = {
            resellerId: selectedResellerId,
            resellerName: selectedReseller.name,
            location: currentZone ? currentZone.name : 'Unknown Area/Type',
            address: address,
            items: orderItems,
            totalAmount: cartTotal,
            date: new Date().toISOString(),
            status: 'Pending'
        };

        // Save to DB
        if (orderId) {
            // Update Existing Order
            await updateResellerOrder(orderId, {
                ...orderData,
                id: orderId, // Ensure ID is preserved
                status: 'Pending' // Reset status to Pending on edit? Or keep existing? Usually reset if re-submitting. Let's keep it simple.
            });
            navigate(`/order-pdf/${orderId}`);
        } else {
            // Create New Order
            const newOrderId = crypto.randomUUID();
            orderData.id = newOrderId;
            await addResellerOrder(orderData);
            navigate(`/order-pdf/${newOrderId}`);
        }
    };

    const handleSettingsClick = () => {
        const password = prompt("Enter Admin Password:");
        if (password === "1234") setIsSettingsOpen(true);
        else if (password !== null) alert("Incorrect Password");
    };

    // Filter items for Modal
    const modalItems = activeCategory
        ? inventory
            .filter(item => item.isVisible !== false)
            .filter(item => item.sku.startsWith(activeCategory))
            .filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        : [];

    return (
        <div className="fade-in h-screen flex flex-col bg-white overflow-hidden">
            {/* --- Top Bar: Context --- */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#510813]">{orderId ? 'Edit Reseller Order' : 'Create Reseller Order'}</h2>
                    </div>
                    {!isPublic && (
                        <button onClick={handleSettingsClick} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                            <Settings size={24} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Reseller Select */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reseller</label>
                        <select
                            value={selectedResellerId}
                            onChange={handleResellerChange}
                            className="w-full p-2.5 bg-white/50 border border-[#510813]/10 rounded-lg focus:ring-2 focus:ring-[#E5562E] focus:border-[#E5562E] outline-none font-medium text-[#510813]"
                        >
                            <option value="">Select Reseller...</option>
                            {resellers.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Area/Type Info */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Area / Type</label>
                        <div className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium flex justify-between items-center">
                            {currentZone ? (
                                <>
                                    <span>{currentZone.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isMinOrderMet ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        Min: ₱{minOrderAmount.toLocaleString()}
                                    </span>
                                </>
                            ) : (
                                <span className="text-gray-400 italic">--</span>
                            )}
                        </div>
                    </div>

                    {/* Address Input */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Delivery Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="Brgy., Province"
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* --- Main Content --- */}
            <div className="flex-1 flex overflow-hidden">

                {/* Floating Submit Button (Mobile Only) */}
                <div className="mobile-submit-bar" style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    borderTop: '1px solid var(--border-color)',
                    padding: '1rem',
                    display: 'none',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                    zIndex: 30
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Items: {Object.values(cart).reduce((a, b) => a + b, 0)}</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>₱{cartTotal.toLocaleString()}</span>
                    </div>
                    {currentZone && !isMinOrderMet && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={14} />
                            <span>Add ₱{(minOrderAmount - cartTotal).toLocaleString()} more to meet minimum</span>
                        </div>
                    )}
                    <button
                        onClick={handleInitialSubmit}
                        disabled={!isMinOrderMet || Object.keys(cart).length === 0}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            borderRadius: '0.75rem',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            backgroundColor: isMinOrderMet && Object.keys(cart).length > 0 ? '#E5562E' : '#d1d5db',
                            color: isMinOrderMet && Object.keys(cart).length > 0 ? 'white' : '#6b7280',
                            cursor: isMinOrderMet && Object.keys(cart).length > 0 ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <FileText size={18} />
                        {orderId ? 'Update Order' : 'Submit Order'}
                    </button>
                </div>

                {/* LEFT: Category Menu */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold text-[#510813] mb-4">Product Categories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CATEGORIES.filter(cat => {
                            const visibleSKUs = inventory.filter(item =>
                                item.sku.startsWith(cat.id) && item.isVisible !== false
                            );
                            return visibleSKUs.length > 0;
                        }).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`relative group p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md text-left flex flex-col justify-between h-40 ${cat.color} ${cat.border} hover:-translate-y-1 bg-white`}
                            >
                                <div className="flex justify-between items-start">
                                    <cat.icon size={32} className="opacity-80" />
                                    <div className="bg-white/50 px-2 py-1 rounded text-xs font-bold">
                                        {Object.keys(cart).filter(sku => sku.startsWith(cat.id)).length} Items
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold">{cat.label}</h4>
                                    <p className="text-sm opacity-75">Click to add items</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Live Summary (Sidebar) */}
                <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-gray-100 bg-white">
                        <h3 className="font-bold text-[#510813] flex items-center gap-2">
                            <ShoppingCart size={20} />
                            Current Order
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {Object.keys(cart).length === 0 ? (
                            <div className="text-center text-gray-400 py-10">
                                <ShoppingBagIcon size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Cart is empty</p>
                                <p className="text-xs">Select a category to start</p>
                            </div>
                        ) : (
                            // Grouped Summary View
                            CATEGORIES.map(cat => {
                                const catItems = Object.entries(cart).filter(([sku]) => sku.startsWith(cat.id));
                                if (catItems.length === 0) return null;

                                const totalQty = catItems.reduce((sum, [, qty]) => sum + qty, 0);
                                const totalPrice = catItems.reduce((sum, [sku, qty]) => sum + (qty * getPrice(sku)), 0);

                                return (
                                    <div key={cat.id} className={`p-3 rounded-lg border ${cat.border} ${cat.color.split(' ')[0]} flex justify-between items-center`}>
                                        <div className="flex items-center gap-3">
                                            <cat.icon size={20} className="opacity-70" />
                                            <div>
                                                <div className="font-bold text-[#510813]">{cat.label}</div>
                                                <div className="text-xs opacity-70">{totalQty} items</div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-800">
                                            ₱{totalPrice.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                            <span>Total Items</span>
                            <span>{Object.values(cart).reduce((a, b) => a + b, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-bold text-[#510813]">Grand Total</span>
                            <span className="text-2xl font-black text-[#E5562E]">₱{cartTotal.toLocaleString()}</span>
                        </div>

                        {/* Min Order Warning */}
                        {currentZone && !isMinOrderMet && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-xs text-red-700">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>
                                    Minimum order for <strong>{currentZone.name}</strong> is ₱{minOrderAmount.toLocaleString()}.
                                    Add <strong>₱{(minOrderAmount - cartTotal).toLocaleString()}</strong> more.
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleInitialSubmit}
                            disabled={!isMinOrderMet || Object.keys(cart).length === 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isMinOrderMet && Object.keys(cart).length > 0
                                ? 'bg-[#E5562E] text-white hover:bg-[#d4451d] hover:scale-[1.02]'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <FileText size={20} />
                            {orderId ? 'Update Order' : 'Submit Order'}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- SKU Selection Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
                    {/* Slide-over Panel (or Modal, user asked for "pop up table on right side", effectively a slide-over or centered modal. Let's do a nice centered modal for "Option A") */}
                    <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4" onClick={() => setIsModalOpen(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden modal-content-mobile" onClick={e => e.stopPropagation()}>

                            {/* Modal Header */}
                            <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${CATEGORIES.find(c => c.id === activeCategory)?.color.split(' ')[0] || 'bg-gray-50'}`}>
                                <div>
                                    <h3 className="text-2xl font-bold text-[#510813]">
                                        Select {CATEGORIES.find(c => c.id === activeCategory)?.label}
                                    </h3>
                                    <p className="text-sm opacity-70">Enter quantities below</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:ring-2 focus:ring-[#E5562E] outline-none text-sm"
                                        />
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content: Table */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-2 md:p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="p-2 md:p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Price</th>
                                            <th className="p-2 md:p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32 text-center">Quantity</th>
                                            <th className="p-2 md:p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {modalItems.map(item => {
                                            const price = getPrice(item.sku);
                                            const qty = tempQuantities[item.sku] || 0;
                                            const total = (qty || 0) * price;
                                            const isSelected = qty > 0;

                                            return (
                                                <tr key={item.sku} className={`hover:bg-[#F3EBD8]/50 transition-colors ${isSelected ? 'bg-[#F3EBD8]' : ''}`}>
                                                    <td className="p-2 md:p-4 font-medium text-[#510813]">
                                                        <div>{item.description}</div>
                                                    </td>
                                                    <td className="p-2 md:p-4 text-right text-gray-600">₱{price.toLocaleString()}</td>
                                                    <td className="p-2 md:p-4">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={tempQuantities[item.sku] === undefined ? '' : tempQuantities[item.sku]}
                                                            onChange={(e) => handleModalQuantityChange(item.sku, e.target.value)}
                                                            className={`w-full p-2 text-center border rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none font-bold ${isSelected ? 'border-[#E5562E] bg-white' : 'border-gray-200 bg-gray-50'}`}
                                                            placeholder="0"
                                                            style={{ fontSize: '16px' }}
                                                        />
                                                    </td>
                                                    <td className={`p-2 md:p-4 font-bold text-gray-800 ${total > 0 ? 'text-right' : 'text-center'}`}>
                                                        {total > 0 ? `₱${total.toLocaleString()}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {modalItems.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="p-10 text-center text-gray-400">
                                                    No items found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    Total for this category: <span className="font-bold text-[#510813]">₱{
                                        modalItems.reduce((sum, item) => sum + ((tempQuantities[item.sku] || 0) * getPrice(item.sku)), 0).toLocaleString()
                                    }</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveModal}
                                        className="px-8 py-2.5 rounded-lg bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#d4451d] transition-all flex items-center gap-2"
                                    >
                                        <Save size={18} />
                                        Save & Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Confirmation Receipt Modal --- */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Order Summary</h3>
                                <p className="text-sm text-gray-500">Please review your order before proceeding.</p>
                            </div>
                            <button onClick={() => setIsConfirmOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Reseller Info */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-[#510813]/10">
                                <div className="text-xs font-bold text-[#510813] uppercase mb-1">Bill To</div>
                                <div className="font-bold text-[#510813] text-lg">{selectedReseller?.name}</div>
                                <div className="text-sm text-gray-600">{currentZone?.name}</div>
                                <div className="text-sm text-gray-600">{address || 'No address provided'}</div>
                            </div>

                            {/* Detailed List */}
                            <div className="space-y-4">
                                {Object.entries(cart).map(([sku, qty]) => {
                                    const item = inventory.find(i => i.sku === sku);
                                    const price = getPrice(sku);
                                    return (
                                        <div key={sku} className="flex justify-between items-start border-b border-gray-50 pb-2 last:border-0">
                                            <div>
                                                <div className="font-medium text-gray-800">{item?.description}</div>
                                                <div className="text-xs text-gray-500">{sku}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">x{qty}</div>
                                                <div className="text-xs text-gray-500">₱{(qty * price).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-bold text-gray-600">Total Amount</span>
                                <span className="text-3xl font-black text-[#E5562E]">₱{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsConfirmOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-white transition-colors"
                                >
                                    Edit Order
                                </button>
                                <button
                                    onClick={handleProceedOrder}
                                    className="flex-[2] py-3 rounded-xl bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#d4451d] transition-all flex items-center justify-center gap-2"
                                >
                                    PROCEED <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ResellerSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

// Helper Icon for empty state
const ShoppingBagIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
);

export default ResellerOrderRedesigned;
