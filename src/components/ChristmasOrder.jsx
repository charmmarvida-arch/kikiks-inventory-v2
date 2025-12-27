import React, { useState, useEffect } from 'react';
// import { useInventory } from '../context/InventoryContext'; // Removed for optimization
import { useNavigate } from 'react-router-dom';
import {
    Settings, ShoppingCart,
    Coffee, IceCream, Droplet, Box, Grid,
    X, CheckCircle,
    Sparkles, Gift, Star, Clock, Calendar // New Year Icons
} from 'lucide-react';
import ChristmasHistoryModal from './ChristmasHistoryModal';

// --- New Year Pattern Component ---
const ChristmasPattern = ({ className, opacity = 0.2, color = "text-white" }) => {
    const icons = [
        { Icon: Sparkles, top: '5%', left: '5%', rot: '45deg', size: 64 },
        { Icon: Gift, top: '15%', left: '25%', rot: '-12deg', size: 48 },
        { Icon: Star, top: '10%', right: '10%', rot: '0deg', size: 80 },
        { Icon: Clock, top: '35%', left: '80%', rot: '20deg', size: 56 }, // Countdown clock
        { Icon: Sparkles, top: '45%', left: '10%', rot: '-25deg', size: 60 },
        { Icon: Gift, top: '55%', right: '20%', rot: '15deg', size: 50 },
        { Icon: Star, top: '75%', left: '30%', rot: '130deg', size: 70 },
        { Icon: Clock, top: '85%', right: '5%', rot: '10deg', size: 55 },
        { Icon: Sparkles, top: '90%', left: '15%', rot: '0deg', size: 40 },
        { Icon: Star, top: '65%', left: '50%', rot: '-45deg', size: 55 },
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

// Category Configuration - New Year Theme
const CATEGORIES = [
    { id: 'FGC', label: 'Cups', icon: Coffee, color: 'bg-[#D97706] text-white', border: 'border-white/20', shadow: 'shadow-[#D97706]/40', ring: 'ring-[#D97706]' }, // Gold/Amber
    { id: 'FGP', label: 'Pints', icon: IceCream, color: 'bg-[#059669] text-white', border: 'border-white/20', shadow: 'shadow-[#059669]/40', ring: 'ring-[#059669]' }, // Emerald (prosperity)
    { id: 'FGL', label: 'Liters', icon: Droplet, color: 'bg-[#7C3AED] text-white', border: 'border-white/20', shadow: 'shadow-[#7C3AED]/40', ring: 'ring-[#7C3AED]' }, // Purple (Royalty/Festive)
    { id: 'FGG', label: 'Gallons', icon: Box, color: 'bg-[#BE123C] text-white', border: 'border-white/20', shadow: 'shadow-[#BE123C]/40', ring: 'ring-[#BE123C]' } // Ruby Red
];

// Special Christmas Pricing
const CHRISTMAS_PRICES = {
    'FGC': 29,
    'FGP': 99,
    'FGL': 200,
    'FGG': 735,
    'FGT': 1000
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
            location: 'Christmas Order', // KEEPING TAG AS 'Christmas Order' to maintain DB consistency
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
        return { error };
    };

    const deleteResellerOrder = async (id) => {
        const { error } = await supabase.from('reseller_orders').delete().eq('id', id);
        if (!error) {
            setResellerOrders(prev => prev.filter(o => o.id !== id));
        }
    };

    // --- State ---
    const [resellerName, setResellerName] = useState('');
    // const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // REMOVED: Always pickup
    // const [address, setAddress] = useState(''); // REMOVED: No delivery
    // const [contactNumber, setContactNumber] = useState(''); // REMOVED
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    // New Year: Location & Pricing State
    const [location, setLocation] = useState('Legazpi'); // 'Legazpi' | 'Sorsogon'

    // Default Menu Config (Prefix-based default prices)
    const DEFAULT_MENU = [
        { sku: 'FGC', description: 'Cups', category: 'FGC', priceLeg: 29, priceSor: 30 },
        { sku: 'FGP', description: 'Pints', category: 'FGP', priceLeg: 99, priceSor: 105 },
        { sku: 'FGL', description: 'Liters', category: 'FGL', priceLeg: 200, priceSor: 210 },
        { sku: 'FGG', description: 'Gallons', category: 'FGG', priceLeg: 735, priceSor: 750 }
    ];

    const [menuConfig, setMenuConfig] = useState(() => {
        const saved = localStorage.getItem('kikiks-newyear-menu');
        return saved ? JSON.parse(saved) : DEFAULT_MENU;
    });

    // Save Menu on Change
    useEffect(() => {
        localStorage.setItem('kikiks-newyear-menu', JSON.stringify(menuConfig));
    }, [menuConfig]);

    const DRAFT_KEY = 'kikiks-newyear-draft';

    // Auto-Restore Draft on Mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.cart && Object.keys(draft.cart).length > 0) {
                    setCart(draft.cart);
                    setResellerName(draft.resellerName || '');
                    // setAddress(draft.address || ''); // Removed
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
    const [isHistoryOpen, setIsHistoryOpen] = useState(false); // For History Modal
    const [editingOrderId, setEditingOrderId] = useState(null); // For Edit Mode

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // --- State for Custom Modals & Submission ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    // Auto-Save to localStorage
    useEffect(() => {
        if (Object.keys(cart).length > 0 || resellerName) {
            const draft = {
                cart,
                resellerName,
                // address, // Removed
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [cart, resellerName]);

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
        // 1. Try exact match in menuConfig
        const exactMatch = menuConfig.find(item => item.sku === sku);
        if (exactMatch) {
            return location === 'Legazpi' ? exactMatch.priceLeg : exactMatch.priceSor;
        }

        // 2. Try prefix match (for generic categories like 'FGC' covering 'FGC-Mango')
        const prefix = sku.split('-')[0];
        const prefixMatch = menuConfig.find(item => item.sku === prefix);
        if (prefixMatch) {
            return location === 'Legazpi' ? prefixMatch.priceLeg : prefixMatch.priceSor;
        }

        return 0;
    };

    const calculateTotal = (items = cart) => {
        return Object.entries(items).reduce((total, [sku, qty]) => {
            if (qty <= 0) return total;
            // Note: We don't check inventory existence strictly for price calculation 
            // because `menuConfig` is the source of truth for price, not inventory table.
            // But we should probably ensure it exists? For now, trust the SKU key.
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

    // --- History / Settings Handlers ---
    const handleSettingsClick = () => {
        const pin = prompt("Enter Admin PIN:");
        if (pin === '1234') {
            setIsHistoryOpen(true);
        } else if (pin !== null) {
            alert("Incorrect PIN");
        }
    };

    const handleEditHistoryOrder = (order) => {
        if (confirm(`Load order for ${order.resellerName} to edit? Current cart will be replaced.`)) {
            setResellerName(order.resellerName || order.reseller_name || '');
            // setAddress(order.address || ''); // Address might be in a different format now or unused
            setCart(order.items || {});
            setEditingOrderId(order.id); // Set Edit Mode
            setIsHistoryOpen(false); // Close Modal

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDeleteHistoryOrder = async (id) => {
        if (confirm("Are you sure you want to delete this order?")) {
            await deleteResellerOrder(id);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        await updateResellerOrder(id, { status: newStatus });
    };

    const handleInitialSubmit = () => {
        if (!resellerName.trim()) return alert('Please enter your name');

        if (!scheduleDate || !scheduleTime) return alert('Please select pick up date and time');

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

            // Format "Address" to simply be Location + Pickup Time
            const finalAddress = `[${location.toUpperCase()}] Pickup: ${scheduleDate} @ ${scheduleTime}`;

            const orderData = {
                // No reseller ID for Christmas orders
                resellerId: null,
                resellerName: resellerName,
                location: 'Christmas Order', // Keep tag for now
                address: finalAddress,
                items: orderItems,
                totalAmount: cartTotal,
                date: new Date().toISOString(),
                status: 'Pending'
            };

            let res;
            if (editingOrderId) {
                // UPDATE existing order
                const dbUpdates = {
                    reseller_name: orderData.resellerName,
                    address: orderData.address,
                    items: orderData.items,
                    total_amount: orderData.totalAmount,
                };
                res = await updateResellerOrder(editingOrderId, dbUpdates);
            } else {
                // CREATE new order
                res = await addResellerOrder(orderData);
            }

            if (res && res.error) {
                throw new Error(res.error.message || "Database Error");
            }

            // Success State

            // --- Send Discord Notification ---
            const WEBHOOK_URL = "https://discord.com/api/webhooks/1451752534820519969/m0cBK-p_JiXIUzIXn0ym2Sx-y6_jmj0O7K5TMhSLC7Q2gP8AaGGC6sScmA52V29X3bTH";

            const itemsList = Object.entries(cart).map(([sku, qty]) => {
                const item = inventory.find(i => i.sku === sku);
                const desc = item ? item.description : sku;
                return `- **${desc}**: x${qty}`;
            }).join('\n');

            const isUpdate = !!editingOrderId;
            const discordPayload = {
                username: "New Year Order Bot",
                avatar_url: "https://cdn-icons-png.flaticon.com/512/3600/3600938.png", // Generic festive icon
                embeds: [{
                    title: isUpdate ? "🎆 New Year Order Updated! 📝" : "🎆 New Year Order Received! 🎁",
                    color: isUpdate ? 3447003 : 16752384, // Blue for Update, Orange/Gold for New
                    fields: [
                        { name: "Reseller Name", value: resellerName, inline: true },
                        { name: "Location", value: location, inline: true },
                        { name: "Schedule", value: `${scheduleDate} @ ${scheduleTime}`, inline: true },
                        { name: "Total Amount", value: `₱${cartTotal.toLocaleString()}`, inline: true },
                        { name: "Details", value: "Customer will pick up at store." },
                        { name: "Order Items", value: itemsList || "No items?" }
                    ],
                    footer: { text: `Order ID: ${isUpdate ? editingOrderId : (res?.data?.id || 'Pending')}` },
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
            // setAddress(''); // Removed
            // setContactNumber(''); // Removed
            setScheduleDate('');
            setScheduleTime('');
            // setDeliveryMethod('pickup'); // Reset to default
            setEditingOrderId(null); // Clear Edit Mode
            setIsConfirmOpen(false);
            setIsSubmitting(false);
            setIsSuccessOpen(true);

        } catch (error) {
            console.error("Order Submission Error:", error);
            setIsSubmitting(false);
            alert("An error occurred: " + error.message);
        }
    };

    // Filter items for Modal
    const modalItems = activeCategory
        ? inventory
            .filter(item => item.isVisible !== false)
            .filter(item => item.sku.startsWith(activeCategory))
            .filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        : [];

    return (
        <div className="fade-in min-h-[100dvh] md:h-screen flex flex-col bg-[#0f172a] md:overflow-hidden relative font-sans">
            {/* New Year BG Pattern */}
            <ChristmasPattern opacity={0.15} color="text-white" />

            {/* --- Top Bar --- */}
            <div className="bg-[#0f172a]/80 backdrop-blur-md px-4 md:px-8 py-4 md:py-6 z-10 flex flex-col-reverse md:flex-row justify-between items-center gap-4 md:gap-0 border-b border-white/10">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    {/* Reseller Name Input */}
                    <input
                        type="text"
                        placeholder="Enter Your Name..."
                        value={resellerName}
                        onChange={e => setResellerName(e.target.value)}
                        className="w-full md:min-w-[300px] bg-[#D97706] text-white placeholder-white/70 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-[#b45309] transition-all outline-none focus:ring-4 ring-white/30 text-lg"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">

                    {/* Location Dropdown */}
                    <div className="relative group">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                            <span className="text-white/70 text-sm font-bold uppercase tracking-wider">Location:</span>
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="bg-transparent text-white font-black text-lg outline-none cursor-pointer appearance-none pr-8"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: `right 0 center`,
                                    backgroundRepeat: `no-repeat`,
                                    backgroundSize: `1.5em 1.5em`
                                }}
                            >
                                <option value="Legazpi" className="text-black">LEGAZPI CITY</option>
                                <option value="Sorsogon" className="text-black">SORSOGON CITY</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-left md:text-right hidden md:block">
                        <h2 className="text-xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 px-4 py-2 bg-[#D97706]/20 rounded-xl backdrop-blur-sm border border-white/10">
                            Happy New Year! 🎆
                        </h2>
                    </div>
                    <button onClick={handleSettingsClick} className="p-3 rounded-full bg-white text-[#0f172a] shadow-md hover:scale-110 transition-transform"><Settings size={20} /></button>
                </div>
            </div>

            {/* --- Content Area --- */}
            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">

                {/* LEFT: Categories */}
                <div className="flex-1 p-4 md:p-8 md:overflow-y-auto pb-48 md:pb-8">
                    {/* Delivery / Pickup Section - SIMPLIFIED */}
                    <div className="mb-8 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        {/* Pickup Only - Just Date/Time */}
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
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
                        <div className="relative z-10 flex-1 flex flex-col overflow-hidden bg-[#F8F9FA] rounded-2xl md:rounded-l-[40px] md:rounded-r-2xl border-4 border-[#1e293b] shadow-xl">
                            <ChristmasPattern opacity={0.05} color="text-[#0f172a]" />

                            <div className="relative z-20 flex flex-col p-6 text-[#0f172a] text-left h-full pb-6">
                                <div className={`flex-shrink-0 hidden md:flex items-center gap-3 mb-6`}>
                                    <div className="bg-[#D97706] text-white p-3 rounded-2xl shadow-lg rotate-3">
                                        <ShoppingCart size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">NEW YEAR CART</h3>
                                        <p className="text-[#0f172a]/80 text-sm font-medium">{Object.values(cart).reduce((a, b) => a + b, 0)} Items added</p>
                                    </div>
                                </div>

                                <div className={`hidden md:block flex-1 min-h-[300px] md:min-h-0 overflow-y-auto space-y-3 pr-2 -mr-2 custom-scrollbar-orange`}>
                                    {Object.keys(cart).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-[#0f172a]/40 border-2 border-dashed border-[#0f172a]/10 rounded-3xl p-6 py-12">
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
                                                        <span className="font-bold text-[#D97706]">₱{totalPrice.toLocaleString()}</span>
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
                                        <span className="text-3xl font-black text-[#D97706]">₱{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={handleInitialSubmit}
                                        disabled={Object.keys(cart).length === 0}
                                        className="w-full bg-[#D97706] hover:bg-[#b45309] text-white py-4 rounded-xl font-bold text-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                    className="md:hidden fixed bottom-8 right-6 z-50 bg-[#D97706] text-white p-4 rounded-full shadow-2xl border-4 border-white/20 animate-bounce"
                >
                    <ShoppingCart size={28} />
                    {Object.values(cart).reduce((a, b) => a + b, 0) > 0 && (
                        <div className="absolute -top-1 -right-1 bg-[#1e293b] text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">
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
                                            <tr key={item.sku} className={`hover:bg-gray-50 ${qty > 0 ? 'bg-indigo-50' : ''}`}>
                                                <td className="p-4 font-bold text-gray-800">{item.description}</td>
                                                <td className="p-4 text-right font-medium text-gray-600">₱{price.toLocaleString()}</td>
                                                <td className="p-4">
                                                    <input
                                                        type="number"
                                                        value={tempQuantities[item.sku] === undefined ? '' : tempQuantities[item.sku]}
                                                        onChange={(e) => handleModalQuantityChange(item.sku, e.target.value)}
                                                        className="w-full p-2 text-center border rounded-lg font-bold text-lg focus:ring-2 focus:ring-[#0f172a] outline-none"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="p-4 text-right font-bold text-[#D97706]">
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
                            <button onClick={handleSaveModal} className="px-8 py-2 rounded-lg bg-[#0f172a] text-white font-bold hover:bg-[#1e293b]">Save Items</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Confirmation Modal --- */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200 shadow-2xl">
                        <h3 className="text-2xl font-black text-[#0f172a] mb-4">Confirm Order</h3>
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
                                <span className="text-3xl font-black text-[#D97706]">₱{cartTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsConfirmOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50">Back</button>
                            <button onClick={handleFinalSubmit} className="flex-1 py-3 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-[#1e293b] shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Success Modal --- */}
            {isSuccessOpen && (
                <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-black text-[#0f172a] mb-2">Order Submitted!</h3>
                        <p className="text-gray-600 mb-6 font-medium">
                            From all of us at Kikiks, thank you 🤍.<br />
                            Wishing you a Happy New Year 🎆
                        </p>
                        <button onClick={() => { setIsSuccessOpen(false); navigate(0); }} className="w-full py-3 rounded-xl bg-[#D97706] text-white font-bold shadow-lg hover:bg-[#b45309]">
                            Start New Order
                        </button>
                    </div>
                </div>
            )}

            {/* --- Settings Modal (History) --- */}
            {/* --- History / Settings Modal --- */}
            {isHistoryOpen && (
                <ChristmasHistoryModal
                    orders={resellerOrders}
                    inventory={inventory}
                    onClose={() => setIsHistoryOpen(false)}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditHistoryOrder}
                    onDelete={handleDeleteHistoryOrder}
                    isProcessing={false}
                    menuConfig={menuConfig}
                    onSaveMenu={setMenuConfig}
                />
            )}
        </div>
    );
};
export default ChristmasOrder;
