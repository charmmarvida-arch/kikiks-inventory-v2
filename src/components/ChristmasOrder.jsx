import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useNavigate } from 'react-router-dom';
import {
    Settings, Search, ShoppingCart,
    Coffee, IceCream, Droplet, Box, Grid,
    ChevronRight, Save, X, Trash2, AlertCircle, FileText, CheckCircle,
    Snowflake, Gift, Star, TreeDeciduous, Calendar // Christmas Icons
} from 'lucide-react';
import { generatePackingList } from '../utils/pdfGenerator';

// --- Christmas Pattern Component ---
const ChristmasPattern = ({ className, opacity = 0.2, color = "text-white" }) => {
    const icons = [
        { Icon: Snowflake, top: '5%', left: '5%', rot: '45deg', size: 64 },
        { Icon: Gift, top: '15%', left: '25%', rot: '-12deg', size: 48 },
        { Icon: Star, top: '10%', right: '10%', rot: '0deg', size: 80 },
        { Icon: TreeDeciduous, top: '35%', left: '80%', rot: '20deg', size: 56 },
        { Icon: Snowflake, top: '45%', left: '10%', rot: '-25deg', size: 60 },
        { Icon: Gift, top: '55%', right: '20%', rot: '15deg', size: 50 },
        { Icon: Star, top: '75%', left: '30%', rot: '130deg', size: 70 },
        { Icon: TreeDeciduous, top: '85%', right: '5%', rot: '10deg', size: 55 },
        { Icon: Snowflake, top: '90%', left: '15%', rot: '0deg', size: 40 },
        { Icon: Grid, top: '65%', left: '50%', rot: '-45deg', size: 55 }, // Grid as placeholder for distinct shape if needed
    ];

    return (
        <div className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`} style={{ opacity }}>
            {icons.map((item, i) => (
                <div
                    key={i}
                    className={`absolute ${color}`}
                    style={{
                        top: item.top,
                        left: item.left,
                        right: item.right,
                        transform: `rotate(${item.rot})`,
                    }}
                >
                    <item.Icon size={item.size} />
                </div>
            ))}
        </div>
    );
};

// Category Configuration - Christmas Theme
const CATEGORIES = [
    { id: 'FGC', label: 'Cups', icon: Coffee, color: 'bg-[#D42426] text-white', border: 'border-white/20', shadow: 'shadow-[#D42426]/40', ring: 'ring-[#D42426]' }, // Red
    { id: 'FGP', label: 'Pints', icon: IceCream, color: 'bg-[#165B33] text-white', border: 'border-white/20', shadow: 'shadow-[#165B33]/40', ring: 'ring-[#165B33]' }, // Green
    { id: 'FGL', label: 'Liters', icon: Droplet, color: 'bg-[#F8B229] text-white', border: 'border-white/20', shadow: 'shadow-[#F8B229]/40', ring: 'ring-[#F8B229]' }, // Gold
    { id: 'FGG', label: 'Gallons', icon: Box, color: 'bg-[#EA4630] text-white', border: 'border-white/20', shadow: 'shadow-[#EA4630]/40', ring: 'ring-[#EA4630]' } // Red-Orange
];

// Special Christmas Pricing
const CHRISTMAS_PRICES = {
    'FGC': 29,
    'FGP': 99,
    'FGL': 200,
    'FGG': 735,
    'FGT': 1000 // Keeping default or need to clarify? Assuming default for now roughly
};

const ChristmasOrder = () => {
    const { inventory, addResellerOrder, resellerOrders, updateResellerOrder, deleteResellerOrder } = useInventory();
    const navigate = useNavigate();

    // --- State ---
    const [resellerName, setResellerName] = useState('');
    const [address, setAddress] = useState('');
    const [isCartExpanded, setIsCartExpanded] = useState(false);

    // Auto-Save State
    const [lastSaved, setLastSaved] = useState(null);
    const [showDraftNotification, setShowDraftNotification] = useState(false);
    const [isDraftRestored, setIsDraftRestored] = useState(false);
    const DRAFT_KEY = 'kikiks-christmas-draft';

    // Auto-Restore Draft on Mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.cart && Object.keys(draft.cart).length > 0) {
                    setCart(draft.cart);
                    setResellerName(draft.resellerName || '');
                    setAddress(draft.address || '');
                    setIsDraftRestored(true);
                    setShowDraftNotification(true);
                    setTimeout(() => setShowDraftNotification(false), 5000);
                }
            } catch (error) {
                console.error('Error restoring draft:', error);
                localStorage.removeItem(DRAFT_KEY);
            }
        }
    }, []);

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

    // --- State for Custom Modals & Submission ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalConfirmOpen, setIsFinalConfirmOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState(null);

    // Auto-Save to localStorage
    useEffect(() => {
        if (Object.keys(cart).length > 0 || resellerName || address) {
            const draft = {
                cart,
                resellerName,
                address,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            setLastSaved(new Date());
        }
    }, [cart, resellerName, address]);

    // Browser Navigation Warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (Object.keys(cart).length > 0) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [cart]);

    // --- Helpers ---
    const getPrice = (sku) => {
        const prefix = sku.split('-')[0];
        return CHRISTMAS_PRICES[prefix] || 0;
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

    // --- Handlers ---
    const handleCategoryClick = (catId) => {
        if (!resellerName.trim()) {
            alert("Please enter your name first!");
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
        if (!resellerName.trim()) return alert('Please enter your name');
        if (Object.keys(cart).length === 0) return alert('Cart is empty');

        setIsConfirmOpen(true);
    };

    const handleFinalSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const orderItems = {};
            Object.entries(cart).forEach(([sku, qty]) => {
                if (qty > 0) orderItems[sku] = qty;
            });

            const orderData = {
                // No reseller ID for Christmas orders
                resellerId: null,
                resellerName: resellerName,
                location: 'Christmas Order', // Tag for filtering
                address: address,
                items: orderItems,
                totalAmount: cartTotal,
                date: new Date().toISOString(),
                status: 'Pending'
            };

            const res = await addResellerOrder(orderData);

            if (res && res.error) {
                throw new Error(res.error.message || "Database Error");
            }

            // Success State
            // Note: addResellerOrder returns { data, error } usually, or just check execution
            setCreatedOrderId(res?.data?.id || 'temp-id'); // Use returned ID if available

            localStorage.removeItem(DRAFT_KEY);
            setCart({});
            setResellerName('');
            setAddress('');
            setIsFinalConfirmOpen(false);
            setIsConfirmOpen(false);
            setIsSubmitting(false);
            setIsSuccessOpen(true);

        } catch (error) {
            console.error("Order Submission Error:", error);
            setIsSubmitting(false);
            alert("An error occurred: " + error.message);
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
        <div className="fade-in h-[100dvh] md:h-screen flex flex-col bg-[#0F4C25] overflow-hidden relative font-sans">
            {/* Christmas BG Pattern */}
            <ChristmasPattern opacity={0.1} color="text-white" />

            {/* --- Top Bar --- */}
            <div className="bg-[#0F4C25] px-4 md:px-8 py-4 md:py-6 z-10 flex flex-col-reverse md:flex-row justify-between items-center gap-4 md:gap-0 border-b border-white/10">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    {/* Reseller Name Input */}
                    <input
                        type="text"
                        placeholder="Enter Your Name..."
                        value={resellerName}
                        onChange={e => setResellerName(e.target.value)}
                        className="w-full md:min-w-[300px] bg-[#BB2528] text-white placeholder-white/70 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-[#a01e21] transition-all outline-none focus:ring-4 ring-white/30 text-lg"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                        <div className="flex flex-col items-end">
                            <img src="/kikiks-logo-christmas.png" alt="Kikiks Logo" className="h-16 mb-2 object-contain" />
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center justify-end gap-2 px-3 py-1 bg-[#D42426]/20 rounded-lg backdrop-blur-sm border border-white/10">
                                Merry Christmas Kikiks!
                            </h2>
                        </div>
                    </div>
                    {/* Settings hidden for public (or keep it if pin protected?) User said "so that customers will only be redirected to this page", implying restricting nav. 
                        But Settings is PIN protected. Keeping it is fine for admin access on public kiosk. */}
                    <button onClick={handleSettingsClick} className="p-3 rounded-full bg-white text-[#0F4C25] shadow-md hover:scale-110 transition-transform"><Settings size={20} /></button>
                </div>
            </div>

            {/* --- Content Area --- */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                {/* LEFT: Categories */}
                <div className="flex-1 p-8 overflow-y-auto pb-40 md:pb-8">
                    {/* Address Field */}
                    <div className="mb-8">
                        <input
                            type="text"
                            placeholder="Bicol Xpress Delivery or by pick up"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-white/30 py-2 text-xl font-bold text-white placeholder-white/50 focus:border-white focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {CATEGORIES.filter(cat => inventory.some(i => i.sku.startsWith(cat.id))).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`relative h-64 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/20 group flex flex-col justify-between overflow-hidden ${cat.color} ${cat.shadow}`}
                            >
                                <cat.icon className="absolute -bottom-8 -right-8 opacity-20 rotate-[-15deg] transition-transform group-hover:rotate-0 group-hover:scale-110" size={160} />
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30">
                                        <cat.icon size={32} className="text-white drop-shadow-sm" />
                                    </div>
                                    <div className="bg-white text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {Object.keys(cart).filter(sku => sku.startsWith(cat.id)).length} Items
                                    </div>
                                </div>
                                <div className="relative z-10 text-left">
                                    <h4 className="text-3xl font-black tracking-wide drop-shadow-md">{cat.label}</h4>
                                    <div className="h-1 w-12 bg-white/50 rounded-full mt-2 group-hover:w-full transition-all duration-500"></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Cart Sidebar */}
                <div className={`fixed bottom-0 left-0 right-0 md:static w-full md:w-[560px] z-50 flex flex-col transition-all duration-300 ease-in-out ${isCartExpanded ? 'h-[75vh]' : 'h-auto'} md:h-full p-3 md:py-4 md:pr-4 md:pl-0 pointer-events-none md:pointer-events-auto`}>
                    <div className="relative flex-1 flex flex-col drop-shadow-2xl pointer-events-auto">
                        <div className="relative z-10 flex-1 flex flex-col overflow-hidden bg-[#F8F9FA] rounded-2xl md:rounded-l-[40px] md:rounded-r-2xl border-4 border-[#0F4C25] shadow-xl">
                            <ChristmasPattern opacity={0.05} color="text-[#0F4C25]" />

                            <div className="relative z-20 flex flex-col p-3 md:p-6 text-[#0F4C25] text-left h-full pb-2 md:pb-6">
                                <div className={`flex-shrink-0 flex items-center gap-3 mb-4 md:mb-6 ${!isCartExpanded ? 'hidden md:flex' : 'flex'}`}>
                                    <div className="bg-[#D42426] text-white p-2 md:p-3 rounded-2xl shadow-lg rotate-3">
                                        <ShoppingCart size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black tracking-tight">HOLIDAY CART</h3>
                                        <p className="text-[#0F4C25]/80 text-xs md:text-sm font-medium">{Object.values(cart).reduce((a, b) => a + b, 0)} Items added</p>
                                    </div>
                                </div>

                                <div className={`flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 -mr-2 custom-scrollbar-orange ${!isCartExpanded ? 'hidden md:block' : 'block'}`}>
                                    {Object.keys(cart).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-[#0F4C25]/40 border-2 border-dashed border-[#0F4C25]/10 rounded-3xl p-6">
                                            <Gift size={48} className="mb-4 opacity-50" />
                                            <p className="text-center font-bold">Your cart is empty!</p>
                                        </div>
                                    ) : (
                                        CATEGORIES.map(cat => {
                                            const catItems = Object.entries(cart).filter(([sku]) => sku.startsWith(cat.id));
                                            if (catItems.length === 0) return null;
                                            const totalPrice = catItems.reduce((sum, [sku, qty]) => sum + (qty * getPrice(sku)), 0);

                                            return (
                                                <div key={cat.id} className="bg-white shadow-sm border border-gray-100 rounded-2xl p-3 md:p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1 rounded-full ${cat.color}`}>
                                                                <cat.icon size={12} />
                                                            </div>
                                                            <span className="font-bold text-sm text-gray-800">{cat.label}</span>
                                                        </div>
                                                        <span className="font-bold text-[#D42426]">₱{totalPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-600 pl-6 border-l-2 border-gray-200 ml-2 space-y-1">
                                                        {catItems.map(([sku, qty]) => {
                                                            const item = inventory.find(i => i.sku === sku);
                                                            return (
                                                                <div key={sku} className="flex justify-between">
                                                                    <span className="truncate w-32">{item?.description || sku}</span>
                                                                    <span>x{qty}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                <div className="flex-shrink-0 mt-auto pt-3 border-t border-gray-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg">Grand Total</span>
                                        <span className="text-3xl font-black text-[#D42426]">₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={handleInitialSubmit}
                                        disabled={Object.keys(cart).length === 0}
                                        className="w-full bg-[#D42426] hover:bg-[#b01b1d] text-white py-4 rounded-xl font-bold text-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Gift size={24} />
                                        PLACE ORDER
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SKU Selection Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${CATEGORIES.find(c => c.id === activeCategory)?.color.split(' ')[0]}`}>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Select {CATEGORIES.find(c => c.id === activeCategory)?.label}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Price</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center w-32">Qty</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {modalItems.map(item => {
                                        const price = getPrice(item.sku);
                                        const qty = tempQuantities[item.sku] || 0;
                                        return (
                                            <tr key={item.sku} className={`hover:bg-gray-50 ${qty > 0 ? 'bg-green-50' : ''}`}>
                                                <td className="p-4 font-bold text-gray-800">{item.description}</td>
                                                <td className="p-4 text-right font-medium text-gray-600">₱{price.toLocaleString()}</td>
                                                <td className="p-4">
                                                    <input
                                                        type="number"
                                                        value={tempQuantities[item.sku] === undefined ? '' : tempQuantities[item.sku]}
                                                        onChange={(e) => handleModalQuantityChange(item.sku, e.target.value)}
                                                        className="w-full p-2 text-center border rounded-lg font-bold text-lg focus:ring-2 focus:ring-[#0F4C25] outline-none"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="p-4 text-right font-bold text-[#D42426]">
                                                    {(qty * price) > 0 && `₱${(qty * price).toLocaleString()}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg border border-gray-300 font-bold hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSaveModal} className="px-8 py-2 rounded-lg bg-[#0F4C25] text-white font-bold hover:bg-[#0a351a]">Save Items</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Confirmation Modal --- */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#0F4C25] mb-4">Confirm Order</h3>
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Name</span>
                                <span className="font-bold">{resellerName}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Total Items</span>
                                <span className="font-bold">{Object.values(cart).reduce((a, b) => a + b, 0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-gray-500">Grand Total</span>
                                <span className="text-3xl font-black text-[#D42426]">₱{cartTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50">Back</button>
                            <button onClick={handleFinalSubmit} className="flex-1 py-3 rounded-xl bg-[#0F4C25] text-white font-bold hover:bg-[#0a351a] shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Success Modal --- */}
            {isSuccessOpen && (
                <div className="fixed inset-0 bg-[#0F4C25]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h3 className="text-2xl font-black text-[#0F4C25] mb-2">Order Received!</h3>
                        <p className="text-gray-600 mb-6">Thank you for your Christmas order, {resellerName}!</p>
                        <button onClick={() => { setIsSuccessOpen(false); navigate(0); }} className="w-full py-3 rounded-xl bg-[#D42426] text-white font-bold shadow-lg hover:bg-[#b01b1d]">
                            Start New Order
                        </button>
                    </div>
                </div>
            )}

            {/* --- Settings Modal (History) --- */}
            {isSettingsOpen && (
                <ChristmasHistoryModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    resellerOrders={resellerOrders}
                    updateResellerOrder={updateResellerOrder} // Pass update function
                    deleteResellerOrder={deleteResellerOrder} // Pass delete function
                />
            )}
        </div>
    );
};

// Sub-component for Settings/History
const ChristmasHistoryModal = ({ isOpen, onClose, resellerOrders, updateResellerOrder, deleteResellerOrder }) => {
    // Filter for Christmas Orders
    const christmasOrders = resellerOrders
        .filter(o => o.location === 'Christmas Order')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Handle Delete
    const handleDelete = async (orderId) => {
        if (window.confirm("Are you sure you want to delete this order?")) {
            await deleteResellerOrder(orderId);
        }
    };

    // Handle Status Update
    const handleStatusChange = async (orderId, newStatus) => {
        await updateResellerOrder(orderId, { status: newStatus });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#0F4C25] text-white rounded-t-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calendar size={24} />
                        Christmas Order History
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name (Reseller)</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {christmasOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">No Christmas orders found yet.</td>
                                </tr>
                            ) : (
                                christmasOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 whitespace-nowrap text-sm text-gray-700">
                                            {new Date(order.date).toLocaleDateString()} <br />
                                            <span className="text-xs text-gray-400">{new Date(order.date).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">{order.resellerName}</td>
                                        <td className="p-4 text-right font-bold text-[#D42426]">₱{(order.totalAmount || 0).toLocaleString()}</td>
                                        <td className="p-4 text-center">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer
                                                    ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-700'}`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(order.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Order"
                                            >
                                                <Trash2 size={18} />
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
    );
};

export default ChristmasOrder;
