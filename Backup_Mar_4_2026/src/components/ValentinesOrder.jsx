
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, Gift, Star, Clock,
    Heart, Flower2, Search, Plus, Minus, ChevronDown, MapPin, X, CheckCircle, AlertCircle, Info,
    Coffee, IceCream, Droplet, Box
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { generatePackingList } from '../utils/pdfGenerator';
const VALENTINES_CONFIG_ID = '11111111-1111-1111-1111-111111111111';
import ValentinesHistoryModal from './ValentinesHistoryModal';
import ValentinesMenuSettings from './ValentinesMenuSettings';

// --- Theme Constants (Premium Red Wine & Oat) ---
// Inverted Concept: Dark Wine Red Background, Light Cream Cards
const THEME = {
    bg: "bg-[#99182A]", // Deep Red Wine Background
    text: "text-[#FAEEEF]", // Light Text for background
    cardBg: "bg-[#FAEEEF]", // Light Cream Cards
    cardText: "text-[#99182A]", // Dark Red Text inside cards
    accent: "text-[#F1DFD1]",
    border: "border-[#F1DFD1]", // Light Borders
};

// --- Pattern: Elegant Swirls (Light mode for dark bg) ---
const SakuraPattern = ({ className, opacity = 0.15 }) => {
    return (
        <div className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`} style={{ opacity }}>
            {[...Array(8)].map((_, i) => (
                <div key={i}
                    className="absolute rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-pulse"
                    style={{
                        top: `${Math.random() * 80}%`,
                        left: `${Math.random() * 80}%`,
                        width: `${Math.random() * 400 + 200}px`,
                        height: `${Math.random() * 400 + 200}px`,
                        backgroundColor: i % 2 === 0 ? '#F1DFD1' : '#F8CCD7',
                        animationDuration: `${Math.random() * 10 + 10}s`
                    }}
                />
            ))}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-overlay"></div>
        </div>
    );
};

const Toast = ({ message, type, isVisible, onClose }) => {
    if (!isVisible) return null;
    return (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[60] flex items-center gap-4 px-6 py-4 rounded-lg shadow-2xl bg-[#FAEEEF] text-[#99182A] animate-in fade-in slide-in-from-top-4 border border-[#99182A]/20`}>
            <Heart size={20} className="fill-[#99182A] text-[#99182A]" />
            <span className="font-serif font-medium tracking-wider text-sm uppercase">{message}</span>
        </div>
    );
};

// --- Categories: Premium Light Cards ---
const STANDARD_CATEGORIES = [
    { id: 'Cake', label: 'Cakes', sub: 'Signature', icon: Gift, color: 'bg-[#FAEEEF]', text: 'text-[#99182A]' },
    { id: 'FGC', label: 'Cups', sub: 'Single', icon: Coffee, color: 'bg-[#FAEEEF]', text: 'text-[#99182A]' },
    { id: 'FGP', label: 'Pints', sub: 'Share', icon: IceCream, color: 'bg-[#FAEEEF]', text: 'text-[#99182A]' },
    { id: 'FGL', label: 'Liters', sub: 'Family', icon: Droplet, color: 'bg-[#FAEEEF]', text: 'text-[#99182A]' },
    { id: 'FGG', label: 'Gallons', sub: 'Party', icon: Box, color: 'bg-[#FAEEEF]', text: 'text-[#99182A]' },
];

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error("Valentines Error:", error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAEEEF] text-[#99182A] p-8 text-center font-serif">
                    <h1 className="text-4xl mb-4">Something went wrong</h1>
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-[#99182A]/20 max-w-2xl overflow-auto">
                        <pre className="text-left text-sm whitespace-pre-wrap font-sans">{this.state.error?.toString()}</pre>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 bg-[#99182A] text-white rounded-full">Reload Page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const ValentinesOrder = () => {
    // --- State ---
    const [inventory, setInventory] = useState([]);
    const [resellerOrders, setResellerOrders] = useState([]);
    const [menuConfig, setMenuConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('kikiks-valentines-menu');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });

    // Sync menu from Cloud
    useEffect(() => {
        const fetchConfig = async () => {
            const { data, error } = await supabase
                .from('reseller_orders')
                .select('items')
                .eq('id', VALENTINES_CONFIG_ID)
                .single();

            if (data && data.items) {
                // Merge with default ensuring array structure
                setMenuConfig(Array.isArray(data.items) ? data.items : []); // Use empty array as default if not found
            }
        };
        fetchConfig();
    }, []);

    // Save menu to Cloud
    const handleSaveMenu = async (newMenu) => {
        setMenuConfig(newMenu);
        localStorage.setItem('kikiks-valentines-menu', JSON.stringify(newMenu));

        try {
            await supabase
                .from('reseller_orders')
                .upsert({
                    id: VALENTINES_CONFIG_ID,
                    status: 'SETTINGS',
                    items: newMenu,
                    reseller_name: 'SYSTEM_CONFIG', // Changed from resellerName to reseller_name for consistency
                    location: 'Config',
                    total_amount: 0, // Changed from totalAmount to total_amount
                    date: new Date().toISOString()
                });
            showToast('Menu synced to cloud!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Saved locally only (Cloud Error)', 'error');
        }
    };

    // Removed the old useEffect that only saved to localStorage
    // useEffect(() => {
    //     localStorage.setItem('kikiks-valentines-menu', JSON.stringify(menuConfig));
    // }, [menuConfig]);

    const [location, setLocation] = useState('SM Legazpi');

    // Form State
    const [fullName, setFullName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [email, setEmail] = useState('');
    const [scheduleDate, setScheduleDate] = useState('2026-02-14');
    const [scheduleTime, setScheduleTime] = useState('');

    const [cart, setCart] = useState({});

    // Modals
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinTarget, setPinTarget] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [tempQuantities, setTempQuantities] = useState({});

    // Submission
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);

    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('kikiks-valentines-menu', JSON.stringify(menuConfig));
    }, [menuConfig]);

    useEffect(() => {
        const fetchData = async () => {
            const [invRes, ordersRes] = await Promise.all([
                supabase.from('inventory').select('sku, description, locations'),
                supabase.from('reseller_orders')
                    .select('*')
                    .eq('location', 'Valentines Order')
                    .order('date', { ascending: false })
                    .limit(50)
            ]);
            if (invRes.data) setInventory(invRes.data);
            if (ordersRes.data) setResellerOrders(ordersRes.data);
        };
        fetchData();
    }, []);

    // Sync Inventory Defaults
    useEffect(() => {
        if (inventory.length > 0 && menuConfig.length === 0) {
            setMenuConfig([
                { sku: 'FGC', description: 'Cups', category: 'FGC', priceLeg: 29, priceSor: 30 },
                { sku: 'FGP', description: 'Pints', category: 'FGP', priceLeg: 99, priceSor: 105 },
                { sku: 'FGL', description: 'Liters', category: 'FGL', priceLeg: 200, priceSor: 210 },
                { sku: 'Cake-V', description: 'Valentines Heart Cake', category: 'Cake', priceLeg: 500, priceSor: 500 },
            ]);
        }
    }, [inventory]);

    const mergedInventory = useMemo(() => {
        return menuConfig.map(menuItem => {
            const invItem = inventory.find(i => i.sku === menuItem.sku);
            return { ...menuItem, stockLeg: invItem?.stockLeg || 0, stockSor: invItem?.stockSor || 0 };
        });
    }, [menuConfig, inventory]);

    // --- Helpers ---
    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const getPrice = (sku) => {
        const item = menuConfig.find(i => i.sku === sku);
        // Use generic price mapping if strictly needed, but roughly Legazpi price for SM Legazpi etc.
        const isSor = location.includes('Sorsogon');
        if (item) return isSor ? item.priceSor : item.priceLeg;

        const prefix = sku.split('-')[0];
        const prefixItem = menuConfig.find(i => i.sku === prefix);
        if (prefixItem) return isSor ? prefixItem.priceSor : prefixItem.priceLeg;
        return 0;
    };

    const cartTotal = useMemo(() => {
        return Object.entries(cart).reduce((sum, [sku, qty]) => sum + (qty * getPrice(sku)), 0);
    }, [cart, location, menuConfig]);

    // --- Actions ---
    const handleCategoryClick = (catId) => {
        if (!fullName || !scheduleTime) {
            return showToast("Please fill in Full Name and Time first.", "error");
        }
        setActiveCategory(catId);
        const relatedItems = mergedInventory.filter(i => i.sku === catId || i.sku.startsWith(catId + '-'));
        const currentQty = {};
        relatedItems.forEach(i => { if (cart[i.sku]) currentQty[i.sku] = cart[i.sku]; });
        setTempQuantities(currentQty);
        setIsModalOpen(true);
    };

    const handleSaveModal = () => {
        const newCart = { ...cart };
        Object.keys(newCart).forEach(sku => { if (sku === activeCategory || sku.startsWith(activeCategory + '-')) delete newCart[sku]; });
        Object.entries(tempQuantities).forEach(([sku, qty]) => { if (qty > 0) newCart[sku] = qty; });
        setCart(newCart);
        setIsModalOpen(false);
        showToast("Added to cart", "success");
    };

    const handleFinalSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const finalAddress = `[${location}] Pickup: ${scheduleDate} @ ${scheduleTime} || Name: ${fullName} || Contact: ${contactNumber} || Email: ${email} || Payment: Pending`;
        const orderData = {
            id: editingOrderId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
            reseller_id: null,
            reseller_name: fullName,
            location: 'Valentines Order',
            address: finalAddress,
            items: cart,
            total_amount: cartTotal,
            date: new Date().toISOString(),
            status: 'Pending'
        };

        try {
            if (editingOrderId) await supabase.from('reseller_orders').update(orderData).eq('id', editingOrderId);
            else await supabase.from('reseller_orders').insert([orderData]);

            // Discord Notification
            const itemLines = Object.entries(cart).map(([sku, qty]) => {
                const desc = mergedInventory.find(i => i.sku === sku)?.description || sku;
                return `- **${desc}**: x${qty}`;
            }).join('\n');

            await fetch("https://discord.com/api/webhooks/1451752534820519969/m0cBK-p_JiXIUzIXn0ym2Sx-y6_jmj0O7K5TMhSLC7Q2gP8AaGGC6sScmA52V29X3bTH", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "Valentines Bot 🌸",
                    avatar_url: "https://cdn-icons-png.flaticon.com/512/350/350065.png",
                    embeds: [{
                        title: editingOrderId ? "🌸 Order Updated" : "🌸 New Valentines Order",
                        color: 15753896, // Soft Sakura Pink Code
                        fields: [
                            { name: "Customer", value: fullName, inline: true },
                            { name: "Contact", value: `${contactNumber} | ${email}`, inline: true },
                            { name: "Location", value: location, inline: true },
                            { name: "Schedule", value: `${scheduleDate} @ ${scheduleTime}`, inline: true },
                            { name: "Total", value: `₱${cartTotal.toLocaleString()}`, inline: true },
                            { name: "Items", value: itemLines || "-" },
                            { name: "Policy", value: "⚠️ Payment Required Today to Reserve" }
                        ],
                        footer: { text: "Kikiks Inventory" }
                    }]
                })
            }).catch(e => console.error("Discord Error:", e));

            // Reset
            setCart({}); setFullName(''); setContactNumber(''); setEmail(''); setEditingOrderId(null); setIsConfirmOpen(false); setIsSuccessOpen(true);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditOrder = (order) => {
        if (!confirm("Edit this order?")) return;
        setCart(order.items || {});
        setEditingOrderId(order.id);
        const rawAddr = order.address || '';

        // Parse Location
        if (rawAddr.includes('SM Legazpi')) setLocation('SM Legazpi');
        else if (rawAddr.includes('SM Sorsogon')) setLocation('SM Sorsogon');

        // Parse Name (Simple extraction from address string if possible, or fallback to stored name)
        // Note: Better parsing logic might be needed if format changes strictly
        setFullName(order.reseller_name || '');

        const schedMatch = rawAddr.match(/Pickup:\s(.*?)\s@\s(.*?)\s\|\|/);
        if (schedMatch) { setScheduleDate(schedMatch[1]); setScheduleTime(schedMatch[2]); }

        setIsHistoryOpen(false);
    };

    return (
        <div className={`min-h-[100dvh] md:h-screen flex flex-col relative font-sans ${THEME.bg} ${THEME.text} md:overflow-hidden font-serif pb-32 md:pb-0`}>
            <Toast {...toast} onClose={() => setToast({ ...toast, visible: false })} />
            <SakuraPattern />

            {/* Header: Transparent on Dark Bg */}
            <header className="relative z-10 p-6 flex justify-between items-center bg-transparent border-b border-[#F1DFD1]/20">
                <div className="flex gap-4 items-center"></div>

                {/* Header Title - Centered Optimized for Mobile */}
                <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none text-center w-full z-0">
                    <div className="flex items-center gap-2 justify-center mb-1">
                        <Heart size={14} className="text-[#F1DFD1] fill-[#F1DFD1] md:w-5 md:h-5" />
                        <h1 className="text-xl md:text-5xl tracking-normal md:tracking-widest uppercase text-[#F1DFD1] whitespace-nowrap" style={{ fontFamily: '"Abril Fatface", cursive' }}>VALENTINES</h1>
                        <Heart size={14} className="text-[#F1DFD1] fill-[#F1DFD1] md:w-5 md:h-5" />
                    </div>
                </div>

                <div className="flex gap-2 ml-auto z-10 relative">
                    <button onClick={() => { setPinTarget('history'); setIsPinModalOpen(true); }} className="p-2 md:p-3 rounded-full border border-[#F1DFD1]/30 text-[#F1DFD1] hover:bg-[#F1DFD1] hover:text-[#99182A] transition-all">
                        <Clock size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => { setPinTarget('menu'); setIsPinModalOpen(true); }} className="p-2 md:p-3 rounded-full border border-[#F1DFD1]/30 text-[#F1DFD1] hover:bg-[#F1DFD1] hover:text-[#99182A] transition-all">
                        <Gift size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={1.5} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden relative z-10">
                {/* Main Content */}
                <div className="flex-1 p-6 md:p-12 md:overflow-y-auto pb-6 md:pb-12 scrollbar-none">
                    {/* Reservation Details Card */}
                    <div className="bg-[#FAEEEF] p-8 md:p-10 rounded-xl shadow-lg border border-white/10 relative mb-12">
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#F1DFD1] text-[#99182A] px-6 py-1 text-[10px] font-serif uppercase tracking-[0.2em] rounded-full shadow-md z-10">
                            Reservation Details
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-stretch mt-4">
                            {/* LEFT: Inputs */}
                            <div className="flex-1 flex flex-col justify-center gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="block text-[10px] font-serif text-[#99182A] uppercase tracking-widest mb-2 ml-1">Customer Name</label>
                                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                            className="w-full bg-white border border-[#99182A]/20 p-3 rounded-lg focus:border-[#99182A] focus:ring-1 focus:ring-[#99182A] outline-none transition-all text-base font-serif text-[#99182A] placeholder-[#99182A]/30"
                                            placeholder="Enter your full name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-serif text-[#99182A] uppercase tracking-widest mb-2 ml-1">Contact Number</label>
                                            <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                                                className="w-full bg-white border border-[#99182A]/20 p-3 rounded-lg focus:border-[#99182A] focus:ring-1 focus:ring-[#99182A] outline-none transition-all text-base font-serif text-[#99182A] placeholder-[#99182A]/30"
                                                placeholder="0912 345 6789"
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-serif text-[#99182A] uppercase tracking-widest mb-2 ml-1">Email <span className="normal-case opacity-50 tracking-normal">(for receipt)</span></label>
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                                className="w-full bg-white border border-[#99182A]/20 p-3 rounded-lg focus:border-[#99182A] focus:ring-1 focus:ring-[#99182A] outline-none transition-all text-base font-serif text-[#99182A] placeholder-[#99182A]/30"
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-[10px] font-serif text-[#99182A] uppercase tracking-widest mb-2 ml-1">Select Location</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['SM Legazpi', 'SM Sorsogon'].map(loc => (
                                                <button key={loc} onClick={() => setLocation(loc)}
                                                    className={`py-3 rounded-lg border border-[#99182A]/30 text-[10px] font-serif uppercase tracking-widest transition-all truncate px-1
                                                        ${location === loc
                                                            ? 'bg-[#99182A] text-white shadow-md'
                                                            : 'bg-white text-[#99182A] hover:bg-[#F8CCD7]'
                                                        }
                                                    `}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="">
                                        <label className="block text-[10px] font-serif text-[#99182A] uppercase tracking-widest mb-2 ml-1">Pickup Date</label>
                                        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                                            className="w-full bg-white border border-[#99182A]/20 p-3 rounded-lg outline-none font-serif text-sm text-[#99182A] focus:border-[#99182A]"
                                        />
                                    </div>
                                    <div className="">
                                        <label className="block text-[10px] font-serif text-[#99182A] uppercase tracking-widest mb-2 ml-1">Pickup Time</label>
                                        <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                                            className="w-full bg-white border border-[#99182A]/20 p-3 rounded-lg outline-none font-serif text-sm text-[#99182A] focus:border-[#99182A]"
                                        />
                                    </div>
                                </div>

                                {/* Payment Policy Notice */}
                                <div className="bg-[#FAE5E5] border border-[#99182A]/20 p-3 rounded-lg flex items-center gap-3 justify-center">
                                    <AlertCircle className="text-[#99182A] shrink-0" size={16} strokeWidth={1.5} />
                                    <div className="text-[10px] font-serif text-[#99182A] leading-relaxed text-center">
                                        <span className="uppercase font-bold tracking-wider">Policy:</span> Payment first policy :) Cake is made to order and is only reserved once payment is made. Thank you!
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Image (Square) */}
                            <div className="w-full md:w-72 h-64 md:h-auto rounded-lg overflow-hidden shadow-md border border-[#99182A]/10 relative group shrink-0 order-first md:order-last">
                                <img
                                    src="/valentines_cake_v2.jpg"
                                    alt="Valentines Cake"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#99182A]/80 to-transparent flex items-end p-4">
                                    <h2 className="text-[#FAEEEF] text-lg md:text-xl tracking-widest uppercase outline-text shadow-black drop-shadow-lg leading-tight" style={{ fontFamily: '"Abril Fatface", cursive' }}>Kikiks<br />Valentines<br />Ice Cream<br />Cake</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categories Grid */}
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                        {STANDARD_CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
                                className={`group relative h-40 rounded-xl p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl overflow-hidden border border-[#99182A]/10 bg-white`}
                            >
                                <div className="relative z-10 h-full flex flex-col justify-center items-center text-center gap-2">
                                    <div className="text-[9px] uppercase tracking-[0.25em] text-[#B05C66]">{cat.sub}</div>
                                    <div className="text-2xl font-serif text-[#99182A]">{cat.label}</div>
                                    <div className="w-8 h-[1px] bg-[#99182A]/30 mt-1 mb-2"></div>
                                    <cat.icon size={18} className="text-[#99182A]" strokeWidth={1.5} />
                                </div>
                                <cat.icon className="absolute -bottom-4 -right-4 opacity-5 text-[#99182A] rotate-12 transition-transform group-hover:rotate-0 group-hover:scale-110" size={100} />
                            </button>
                        ))}
                    </div>
                </div>
                {/* Right: Premium Sidebar (Cart) */}
                <div className="w-full md:w-[350px] bg-[#FAEEEF] border-t md:border-t-0 md:border-l border-[#99182A]/20 flex flex-col z-20 shadow-2xl">
                    <div className="p-8 pb-6 flex justify-between items-center bg-[#FAEEEF] border-b border-[#99182A]/10">
                        <h2 className="text-xl font-serif text-[#99182A] tracking-wider uppercase">Your Selection</h2>
                        <div className="bg-[#99182A] text-white px-3 py-1 rounded-full text-[10px] font-serif tracking-widest">{Object.keys(cart).length} ITEMS</div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 bg-[#FAEEEF]/50 h-64 md:h-auto">
                        {Object.keys(cart).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40 text-[#99182A]">
                                <img src="https://cdn-icons-png.flaticon.com/512/2218/2218760.png" className="w-16 h-16 opacity-50 grayscale" alt="" />
                                <span className="text-xs font-serif tracking-[0.2em] uppercase">No Items Selected</span>
                            </div>
                        ) : (
                            Object.entries(cart).map(([sku, qty]) => {
                                const item = mergedInventory.find(i => i.sku === sku);
                                const price = item ? (location === 'SM Legazpi' ? item.priceLeg : item.priceSor) : 0; // Fix location check
                                return (
                                    <div key={sku} className="group flex justify-between items-center py-4 border-b border-[#99182A]/10 last:border-0 hover:bg-white/50 transition-colors -mx-4 px-4 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full border border-[#99182A] bg-white flex items-center justify-center text-xs font-serif text-[#99182A]">{qty}</div>
                                            <div>
                                                <div className="text-sm font-serif text-[#99182A] tracking-wide">{item?.description}</div>
                                                <div className="text-[10px] font-serif text-[#B05C66] tracking-wider">₱{price} each</div>
                                            </div>
                                        </div>
                                        <div className="text-base font-serif text-[#99182A]">₱{(price * qty).toLocaleString()}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-8 bg-white border-t border-[#99182A]/10">
                        <div className="flex justify-between items-end mb-8">
                            <span className="text-[10px] font-serif text-[#B05C66] uppercase tracking-[0.2em]">Total Amount</span>
                            <span className="text-3xl font-serif text-[#99182A]">₱{cartTotal.toLocaleString()}</span>
                        </div>
                        <button
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={Object.keys(cart).length === 0}
                            className={`w-full py-4 rounded-lg font-serif text-xs uppercase tracking-[0.25em] transition-all border border-[#99182A]
                                ${Object.keys(cart).length > 0 ? 'bg-[#99182A] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5' : 'bg-transparent text-[#99182A]/30 border-[#99182A]/20 cursor-not-allowed'}
                            `}
                        >
                            Place Order
                        </button>
                    </div>
                </div>
            </div >

            {/* --- Modals (Premium Redesign) --- */}

            {/* 1. Item Selection */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C1810]/40 backdrop-blur-sm p-4">
                        <div className="w-full max-w-4xl h-[70vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#99182A]/20 relative">
                            {/* Background Image with Overlay */}
                            <div className="absolute inset-0 bg-[url('/valentines_modal_bg.jpg')] bg-cover bg-center"></div>
                            <div className="absolute inset-0 bg-[#FAEEEF]/40 backdrop-blur-[2px]"></div>

                            <div className="p-6 border-b border-[#99182A]/10 flex justify-between items-center relative z-10">
                                <h3 className="text-xl font-serif text-[#99182A] tracking-widest uppercase">{STANDARD_CATEGORIES.find(c => c.id === activeCategory)?.label}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full border border-[#99182A]/20 hover:border-[#99182A] flex items-center justify-center text-[#99182A] transition-colors"><X size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {mergedInventory
                                        .filter(item => item.sku === activeCategory || item.sku.startsWith(activeCategory + '-'))
                                        .map(item => {
                                            const price = location.includes('Legazpi') ? item.priceLeg : item.priceSor;
                                            const isActive = tempQuantities[item.sku] > 0;
                                            return (
                                                <div key={item.sku} className={`bg-white/80 backdrop-blur-md p-6 rounded-xl border transition-all flex flex-col gap-4 text-center relative 
                                            ${isActive ? 'border-[#99182A] shadow-md' : 'border-[#99182A]/10 hover:border-[#99182A]/50 hover:shadow-sm'}`}>

                                                    {isActive && <div className="absolute top-3 right-3 text-[#99182A]"><CheckCircle size={16} fill="#F8CCD7" /></div>}

                                                    <div>
                                                        <div className="font-serif text-lg text-[#99182A] mb-1">{item.description}</div>
                                                        <div className="text-xs font-serif text-[#B05C66] tracking-widest">₱{price}</div>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-4 bg-[#FAEEEF] rounded-full p-2 w-fit mx-auto relative z-20">
                                                        <button type="button" onClick={() => setTempQuantities(prev => ({ ...prev, [item.sku]: Math.max(0, (prev[item.sku] || 0) - 1) }))} className="w-10 h-10 rounded-full border border-[#99182A]/20 flex items-center justify-center text-[#99182A] hover:bg-white touch-manipulation active:scale-90 transition-transform"><Minus size={14} /></button>
                                                        <span className="w-6 font-serif text-[#99182A]">{tempQuantities[item.sku] || 0}</span>
                                                        <button type="button" onClick={() => setTempQuantities(prev => ({ ...prev, [item.sku]: (prev[item.sku] || 0) + 1 }))} className="w-10 h-10 rounded-full bg-[#99182A] text-white flex items-center justify-center hover:bg-[#8A1525] touch-manipulation active:scale-90 transition-transform"><Plus size={14} /></button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                            <div className="p-6 border-t border-[#99182A]/10 flex justify-end relative z-10">
                                <button onClick={handleSaveModal} className="px-8 py-3 bg-[#99182A] text-white rounded-lg font-serif text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-[#8A1525] transition-colors">Confirm Selection</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 2. PIN Modal */}
            {
                isPinModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C1810]/40 backdrop-blur-md">
                        <div className="bg-[#FAEEEF] p-10 rounded-2xl shadow-2xl border border-[#99182A]/20 text-center w-80 relative">
                            <button onClick={() => setIsPinModalOpen(false)} className="absolute top-4 right-4 text-[#99182A]"><X size={18} /></button>
                            <Heart size={32} className="mx-auto text-[#99182A] mb-6 fill-[#99182A]" />
                            <h3 className="text-sm font-serif text-[#99182A] uppercase tracking-widest mb-6">Staff Access</h3>
                            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
                                className="w-full text-center text-2xl font-serif text-[#99182A] border-b border-[#99182A] pb-2 outline-none mb-8 bg-transparent" autoFocus placeholder="...." maxLength={4}
                            />
                            <button onClick={() => {
                                if (pinInput === '1234') {
                                    setIsPinModalOpen(false); setPinInput('');
                                    if (pinTarget === 'menu') setIsMenuOpen(true);
                                    if (pinTarget === 'history') setIsHistoryOpen(true);
                                } else showToast('Invalid PIN', 'error');
                            }} className="w-full py-3 bg-[#99182A] text-white rounded-lg font-serif text-xs uppercase tracking-[0.2em]">Enter</button>
                        </div>
                    </div>
                )
            }

            {/* 3. Success / Confirm */}
            {
                isConfirmOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C1810]/60 backdrop-blur-sm p-4">
                        <div className="bg-[#FAEEEF] max-w-sm w-full rounded-2xl p-10 text-center shadow-2xl border border-[#99182A]/20">
                            <h3 className="font-serif text-2xl text-[#99182A] mb-2">Confirm Order?</h3>
                            <p className="text-[10px] font-serif text-[#B05C66] uppercase tracking-widest mb-8">Please review your details.</p>
                            <button onClick={handleFinalSubmit} disabled={isSubmitting} className="w-full py-3 bg-[#99182A] text-white rounded-lg font-serif text-xs uppercase tracking-[0.2em] mb-3 hover:bg-[#8A1525] transition-colors">
                                {isSubmitting ? 'Processing...' : 'Confirm Order'}
                            </button>
                            <button onClick={() => setIsConfirmOpen(false)} className="text-[10px] font-serif text-[#B05C66] uppercase tracking-widest hover:text-[#99182A] underline">Cancel</button>
                        </div>
                    </div>
                )
            }

            {
                isSuccessOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#99182A] p-8 animate-in zoom-in-95 duration-700">
                        <div className="bg-[#FAEEEF] p-16 rounded-3xl border border-white/20 text-center shadow-2xl max-w-lg w-full">
                            <Heart size={64} className="mx-auto text-[#99182A] mb-6 fill-[#F8CCD7] animate-pulse" />
                            <h2 className="text-4xl font-serif text-[#99182A] mb-4">Thank You</h2>
                            <p className="text-xs font-serif text-[#B05C66] uppercase tracking-widest mb-12 leading-relaxed">Your order has been placed.<br />Please ensure payment is made today.</p>
                            <button onClick={() => setIsSuccessOpen(false)} className="px-12 py-3 bg-[#99182A] text-white rounded-lg font-serif text-xs uppercase tracking-[0.2em] hover:bg-[#8A1525] transition-all">Close</button>
                        </div>
                    </div>
                )
            }

            <ValentinesHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onEdit={handleEditOrder} />
            <ValentinesMenuSettings isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} menuConfig={menuConfig} onSaveMenu={handleSaveMenu} />
        </div >
    );
};

export default function ValentinesOrderWithBoundary(props) {
    return (
        <ErrorBoundary>
            <ValentinesOrder {...props} />
        </ErrorBoundary>
    );
}
