import React, { useState, useEffect } from 'react';
// import { useInventory } from '../context/InventoryContext'; // Removed for optimization
import { useNavigate } from 'react-router-dom';
import {
    Settings, ShoppingCart,
    Coffee, IceCream, Droplet, Box, Grid,
    X, CheckCircle,
    Snowflake, Gift, Star, TreeDeciduous, Calendar // Christmas Icons
} from 'lucide-react';

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

import { supabase } from '../supabaseClient'; // Direct Supabase for performance

const ChristmasOrder = () => {
    // const { inventory, addResellerOrder, resellerOrders, updateResellerOrder, deleteResellerOrder } = useInventory(); // Removed global context for speed
    const navigate = useNavigate();

    // --- Local Data State for Speed ---
    const [inventory, setInventory] = useState([]);
    const [resellerOrders, setResellerOrders] = useState([]); // Only for History Modal which is PIN protected

    // Optimized Fetch
    useEffect(() => {
        const fetchEssentialData = async () => {
            // 1. Fetch Products (Only what's needed)
            const { data: products } = await supabase
                .from('inventory')
                .select('sku, description, quantity')
                .or('sku.ilike.FGC%,sku.ilike.FGP%,sku.ilike.FGL%,sku.ilike.FGG%'); // Only fetch relevant categories

            if (products) setInventory(products);

            // 2. Fetch Orders for History (Only fetch recent ones to save data?)
            // We fetch this ONLY if Admin Settings is opened usually, but to keep logic simple we fetch here
            // actually let's only fetch logic INSIDE the history modal to be truly fast?
            // For now, let's just fetch them but lighter.
            const { data: orders } = await supabase
                .from('reseller_orders')
                .select('*')
                .eq('location', 'Christmas Order')
                .order('date', { ascending: false });

            if (orders) setResellerOrders(orders);
        };

        fetchEssentialData();
    }, []);

    // Local Add Order Function (Bypassing Context)
    const addResellerOrder = async (orderData) => {
        // Prepare DB object (snake_case)
        const dbOrder = {
            id: crypto.randomUUID(),
            reseller_id: null,
            reseller_name: orderData.resellerName,
            location: 'Christmas Order',
            address: orderData.address,
            items: orderData.items, // JSONB
            total_amount: orderData.totalAmount,
            date: orderData.date,
            status: 'Pending'
        };

        const { data, error } = await supabase
            .from('reseller_orders')
            .insert([dbOrder])
            .select()
            .single();

        if (data) {
            setResellerOrders(prev => [data, ...prev]); // Optimistic update for history
            return { data };
        }
        return { error };
    };

    // Local Update/Delete for History
    const updateResellerOrder = async (id, updates) => {
        const { error } = await supabase.from('reseller_orders').update(updates).eq('id', id);
        if (!error) {
            setResellerOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
        }
    };

    const deleteResellerOrder = async (id) => {
        const { error } = await supabase.from('reseller_orders').delete().eq('id', id);
        if (!error) {
            setResellerOrders(prev => prev.filter(o => o.id !== id));
        }
    };

    // --- State ---
    const [resellerName, setResellerName] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // 'pickup' or 'delivery'
    const [address, setAddress] = useState(''); // Used for Delivery Address
    const [contactNumber, setContactNumber] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

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
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

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

        if (deliveryMethod === 'delivery') {
            if (!contactNumber.trim()) return alert('Please enter your contact number');
            if (!address.trim()) return alert('Please enter complete delivery address');
            if (!scheduleDate || !scheduleTime) return alert('Please select delivery date and time');
        } else {
            if (!scheduleDate || !scheduleTime) return alert('Please select pick up date and time');
        }

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

            // Format "Address" to contain all delivery info
            let finalAddress = '';
            if (deliveryMethod === 'delivery') {
                finalAddress = `[DELIVERY] ${address} | Contact: ${contactNumber} | Schedule: ${scheduleDate} @ ${scheduleTime}`;
            } else {
                finalAddress = `[PICKUP] Schedule: ${scheduleDate} @ ${scheduleTime}`;
            }

            const orderData = {
                // No reseller ID for Christmas orders
                resellerId: null,
                resellerName: resellerName,
                location: 'Christmas Order', // Tag for filtering
                address: finalAddress,
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

            // --- Send Discord Notification ---
            const WEBHOOK_URL = "https://discord.com/api/webhooks/1451752534820519969/m0cBK-p_JiXIUzIXn0ym2Sx-y6_jmj0O7K5TMhSLC7Q2gP8AaGGC6sScmA52V29X3bTH";

            const itemsList = Object.entries(cart).map(([sku, qty]) => {
                const item = inventory.find(i => i.sku === sku);
                const desc = item ? item.description : sku;
                return `- **${desc}**: x${qty}`;
            }).join('\n');

            const discordPayload = {
                username: "Christmas Order Bot",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/3600/3600938.png", // Generic festive icon
                embeds: [{
                    title: "🎄 New Christmas Order Received!",
                    color: 13902886, // #D42426 (Red)
                    fields: [
                        { name: "Reseller Name", value: resellerName, inline: true },
                        { name: "Type", value: deliveryMethod === 'delivery' ? '🚚 Delivery' : '🏪 Pick Up', inline: true },
                        { name: "Schedule", value: `${scheduleDate} @ ${scheduleTime}`, inline: true },
                        { name: "Total Amount", value: `₱${cartTotal.toLocaleString()}`, inline: true },
                        { name: "Details", value: deliveryMethod === 'delivery' ? `📍 ${address}\n📞 ${contactNumber}` : "Customer will pick up at store." },
                        { name: "Order Items", value: itemsList || "No items?" }
                    ],
                    footer: { text: `Order ID: ${res?.data?.id || 'Pending'}` },
                    timestamp: new Date().toISOString()
                }]
            };

            fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            }).catch(err => console.error("Discord Notification Failed:", err));
            // ---------------------------------

            localStorage.removeItem(DRAFT_KEY);
            setCart({});
            setResellerName('');
            setAddress('');
            setContactNumber('');
            setScheduleDate('');
            setScheduleTime('');
            setDeliveryMethod('pickup'); // Reset to default
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
        <div className="fade-in min-h-[100dvh] md:h-screen flex flex-col bg-[#0F4C25] md:overflow-hidden relative font-sans">
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
                        <h2 className="text-xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 px-4 py-2 bg-[#D42426]/20 rounded-xl backdrop-blur-sm border border-white/10">
                            Merry Christmas Kikiks! 🎄
                        </h2>
                        <div className="md:hidden bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold mt-2 text-center animate-pulse">
                            UPDATE v2.3 - SCROLL DOWN FOR BUTTON 👇
                        </div>
                    </div>
                    {/* Settings hidden for public (or keep it if pin protected?) User said "so that customers will only be redirected to this page", implying restricting nav. 
                        But Settings is PIN protected. Keeping it is fine for admin access on public kiosk. */}
                    <button onClick={handleSettingsClick} className="p-3 rounded-full bg-white text-[#0F4C25] shadow-md hover:scale-110 transition-transform"><Settings size={20} /></button>
                </div>
            </div>

            {/* --- Content Area --- */}
            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">

                {/* LEFT: Categories */}
                <div className="flex-1 p-4 md:p-8 md:overflow-y-auto pb-48 md:pb-8">
                    {/* Delivery / Pickup Section */}
                    <div className="mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                        {/* Method Toggle */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setDeliveryMethod('delivery')}
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${deliveryMethod === 'delivery' ? 'bg-[#D42426] text-white shadow-lg scale-105' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                            >
                                🚚 Bicol Xpress Delivery
                            </button>
                            <button
                                onClick={() => setDeliveryMethod('pickup')}
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${deliveryMethod === 'pickup' ? 'bg-[#F8B229] text-[#0F4C25] shadow-lg scale-105' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                            >
                                🏪 Pick Up
                            </button>
                        </div>

                        {/* Conditional Fields */}
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                            {deliveryMethod === 'delivery' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="Contact Number"
                                            value={contactNumber}
                                            onChange={e => setContactNumber(e.target.value)}
                                            className="w-full bg-black/20 border-b-2 border-white/30 py-2 px-3 rounded-t-lg text-lg font-bold text-white placeholder-white/50 focus:border-white focus:outline-none transition-colors"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={scheduleDate}
                                                onChange={e => setScheduleDate(e.target.value)}
                                                className="flex-1 bg-black/20 border-b-2 border-white/30 py-2 px-3 rounded-t-lg text-lg font-bold text-white focus:border-white focus:outline-none transition-colors [color-scheme:dark]"
                                            />
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                onChange={e => setScheduleTime(e.target.value)}
                                                className="w-32 bg-black/20 border-b-2 border-white/30 py-2 px-3 rounded-t-lg text-lg font-bold text-white focus:border-white focus:outline-none transition-colors [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <textarea
                                        placeholder="Complete Delivery Address"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        rows={2}
                                        className="w-full bg-black/20 border-b-2 border-white/30 py-2 px-3 rounded-t-lg text-lg font-bold text-white placeholder-white/50 focus:border-white focus:outline-none transition-colors resize-none"
                                    />
                                </>
                            )}

                            {deliveryMethod === 'pickup' && (
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-white/70 text-sm block mb-1">Pick Up Date</label>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={e => setScheduleDate(e.target.value)}
                                            className="w-full bg-black/20 border-b-2 border-white/30 py-2 px-3 rounded-t-lg text-lg font-bold text-white focus:border-white focus:outline-none transition-colors [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-white/70 text-sm block mb-1">Pick Up Time</label>
                                        <input
                                            type="time"
                                            value={scheduleTime}
                                            onChange={e => setScheduleTime(e.target.value)}
                                            className="w-full bg-black/20 border-b-2 border-white/30 py-2 px-3 rounded-t-lg text-lg font-bold text-white focus:border-white focus:outline-none transition-colors [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
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

                {/* RIGHT: Cart Sidebar (Static Flow on Mobile) */}
                <div id="cart-section" className={`w-full md:w-[560px] flex flex-col transition-all duration-300 ease-in-out md:h-full p-4 md:pl-0 order-last md:order-none `}>
                    <div className="relative flex-1 flex flex-col drop-shadow-2xl">
                        <div className="relative z-10 flex-1 flex flex-col overflow-hidden bg-[#F8F9FA] rounded-2xl md:rounded-l-[40px] md:rounded-r-2xl border-4 border-[#0F4C25] shadow-xl">
                            <ChristmasPattern opacity={0.05} color="text-[#0F4C25]" />

                            <div className="relative z-20 flex flex-col p-6 text-[#0F4C25] text-left h-full pb-6">
                                <div className={`flex-shrink-0 hidden md:flex items-center gap-3 mb-6`}>
                                    <div className="bg-[#D42426] text-white p-3 rounded-2xl shadow-lg rotate-3">
                                        <ShoppingCart size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">HOLIDAY CART</h3>
                                        <p className="text-[#0F4C25]/80 text-sm font-medium">{Object.values(cart).reduce((a, b) => a + b, 0)} Items added</p>
                                    </div>
                                </div>

                                <div className={`hidden md:block flex-1 min-h-[300px] md:min-h-0 overflow-y-auto space-y-3 pr-2 -mr-2 custom-scrollbar-orange`}>
                                    {Object.keys(cart).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-[#0F4C25]/40 border-2 border-dashed border-[#0F4C25]/10 rounded-3xl p-6 py-12">
                                            <Gift size={48} className="mb-4 opacity-50" />
                                            <p className="text-center font-bold">Your cart is empty!</p>
                                        </div>
                                    ) : (
                                        CATEGORIES.map(cat => {
                                            const catItems = Object.entries(cart).filter(([sku]) => sku.startsWith(cat.id));
                                            if (catItems.length === 0) return null;
                                            const totalPrice = catItems.reduce((sum, [sku, qty]) => sum + (qty * getPrice(sku)), 0);

                                            return (
                                                <div key={cat.id} className="bg-white shadow-sm border border-gray-100 rounded-2xl p-4">
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

                                <div className="flex-shrink-0 mt-auto pt-6 border-t border-gray-100 flex flex-col gap-3">
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
                                    {/* Mobile Spacer to prevent cropping */}
                                    <div className="h-48 md:hidden w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAB for Mobile */}
                <button
                    onClick={() => document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth' })}
                    className="md:hidden fixed bottom-8 right-6 z-50 bg-[#D42426] text-white p-4 rounded-full shadow-2xl border-4 border-white/20 animate-bounce"
                >
                    <ShoppingCart size={28} />
                    {Object.values(cart).reduce((a, b) => a + b, 0) > 0 && (
                        <div className="absolute -top-1 -right-1 bg-[#F8B229] text-[#0F4C25] font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">
                            {Object.values(cart).reduce((a, b) => a + b, 0)}
                        </div>
                    )}
                </button>
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
                        <h3 className="text-2xl font-black text-[#0F4C25] mb-2">Order Submitted!</h3>
                        <p className="text-gray-600 mb-6 font-medium">
                            From all of us at Kikiks, thank you 🤍.<br />
                            Wishing you a Merry Christmas 🎄
                        </p>
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
const ChristmasHistoryModal = ({ onClose, resellerOrders, updateResellerOrder, deleteResellerOrder }) => {
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
