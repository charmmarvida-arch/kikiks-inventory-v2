import React, { useState, useEffect, useMemo } from 'react';
// import { useInventory } from '../context/InventoryContext'; // Removed for optimization
import { useNavigate } from 'react-router-dom';
import {
    Settings, ShoppingCart,
    Coffee, IceCream, Droplet, Box, Grid,
    X, CheckCircle, AlertCircle, Check, Info,
    Sparkles, Gift, Star, Clock, Calendar, ClipboardList, Snowflake,
    Leaf, Sun, Flower2, Utensils, // Tropical Icons
    ArrowLeft, ArrowRight, Search, Plus, Minus, ShoppingBag, ChevronUp, ChevronDown, MapPin
} from 'lucide-react';
import ChristmasHistoryModal from './ChristmasHistoryModal';
import ChristmasMenuSettings from './ChristmasMenuSettings';
import ErrorBoundary from './ErrorBoundary';

// --- Tropical New Year Pattern ---
const ChristmasPattern = ({ className, opacity = 0.15, color = "text-[#E5562E]" }) => {
    const icons = [
        { Icon: Leaf, top: '5%', left: '5%', rot: '45deg', size: 64 },
        { Icon: Sparkles, top: '15%', left: '25%', rot: '-12deg', size: 48 },
        { Icon: Sun, top: '10%', right: '10%', rot: '0deg', size: 80 },
        { Icon: Clock, top: '35%', left: '80%', rot: '20deg', size: 56 },
        { Icon: IceCream, top: '45%', left: '10%', rot: '-25deg', size: 60 },
        { Icon: Utensils, top: '55%', right: '20%', rot: '15deg', size: 50 },
        { Icon: Star, top: '75%', left: '30%', rot: '130deg', size: 70 },
        { Icon: Clock, top: '85%', right: '5%', rot: '10deg', size: 55 },
        { Icon: Sun, top: '90%', left: '15%', rot: '0deg', size: 40 },
        { Icon: Flower2, top: '65%', left: '50%', rot: '-45deg', size: 55 },
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

// Standard Categories with Tropical Palette
const STANDARD_CATEGORIES = [
    { id: 'Cake', label: 'Cake', icon: Sparkles, color: 'bg-[#EC4899] text-white', border: 'border-white/20', shadow: 'shadow-[#EC4899]/40', ring: 'ring-[#EC4899]' },
    { id: 'FGC', label: 'Cups', icon: Coffee, color: 'bg-[#F49306] text-white', border: 'border-white/20', shadow: 'shadow-[#F49306]/40', ring: 'ring-[#F49306]' },
    { id: 'FGP', label: 'Pints', icon: IceCream, color: 'bg-[#FF5A5F] text-white', border: 'border-white/20', shadow: 'shadow-[#FF5A5F]/40', ring: 'ring-[#FF5A5F]' },
    { id: 'FGL', label: 'Liters', icon: Droplet, color: 'bg-[#888625] text-white', border: 'border-white/20', shadow: 'shadow-[#888625]/40', ring: 'ring-[#888625]' },
    { id: 'FGG', label: 'Gallons', icon: Box, color: 'bg-[#E5562E] text-white', border: 'border-white/20', shadow: 'shadow-[#E5562E]/40', ring: 'ring-[#E5562E]' }
];

// Special Pricing
const CHRISTMAS_PRICES = {
    'FGC': 29,
    'FGP': 99,
    'FGL': 200,
    'FGG': 735,

    'FGT': 1000,
    'FGCK': 0 // Default for Cakes (User updates in Settings)
};

import { supabase } from '../supabaseClient'; // Direct Supabase for performance

// --- Custom UI Components ---

const Toast = ({ message, type, isVisible, onClose }) => {
    if (!isVisible) return null;

    const styles = {
        success: "bg-emerald-100 border-emerald-500 text-emerald-800",
        error: "bg-red-100 border-red-500 text-red-800",
        info: "bg-blue-100 border-blue-500 text-blue-800"
    };

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info
    };

    const Icon = icons[type] || Info;

    return (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-l-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${styles[type]}`}>
            <Icon size={24} className="shrink-0" />
            <span className="font-bold text-lg">{message}</span>
            <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                <X size={18} />
            </button>
        </div>
    );
};

const CustomDropdown = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.custom-dropdown')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className="relative custom-dropdown">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-5 py-3 bg-[#510813] text-[#FEFCE8] rounded-2xl shadow-lg border-2 border-[#E5562E]/50 hover:bg-[#6A101C] transition-all duration-200 group"
            >
                <MapPin className="text-[#E5562E]" size={20} />
                <span className="font-bold uppercase tracking-wider text-sm">{selectedLabel}</span>
                <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#510813]/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-5 py-3 font-bold flex items-center justify-between transition-colors
                                ${value === option.value ? 'bg-[#FEFCE8] text-[#E5562E]' : 'text-[#510813] hover:bg-[#F5F5DC]'}
                            `}
                        >
                            {option.label}
                            {value === option.value && <CheckCircle size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const ChristmasOrder = () => {
    const navigate = useNavigate();

    // --- State: Inventory & Menu ---
    const [inventory, setInventory] = useState([]);

    // Default Menu Config
    const DEFAULT_MENU = [
        { sku: 'FGC', description: 'Cups', category: 'FGC', priceLeg: 29, priceSor: 30 },
        { sku: 'FGP', description: 'Pints', category: 'FGP', priceLeg: 99, priceSor: 105 },
        { sku: 'FGL', description: 'Liters', category: 'FGL', priceLeg: 200, priceSor: 210 },
        { sku: 'FGG', description: 'Gallons', category: 'FGG', priceLeg: 735, priceSor: 750 }
    ];

    const [menuConfig, setMenuConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('kikiks-newyear-menu');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) ? parsed : DEFAULT_MENU;
        } catch (e) {
            console.error("Failed to parse menu config:", e);
            return DEFAULT_MENU;
        }
    });

    // Save Menu on Change
    useEffect(() => {
        localStorage.setItem('kikiks-newyear-menu', JSON.stringify(menuConfig));
    }, [menuConfig]);

    // Auto-Populate Menu from Inventory (Fix for Mobile/New Devices)
    useEffect(() => {
        if (inventory.length > 0) {
            setMenuConfig(prev => {
                const cloudMap = new Map();
                inventory.forEach(i => cloudMap.set(i.sku, i));

                // Helper to extract prices
                const getCloudPrices = (i) => {
                    let rawLocs = Array.isArray(i.locations) ? i.locations : [];
                    const locData = rawLocs.map(l => {
                        if (typeof l === 'string' && l.trim().startsWith('{')) {
                            try { return JSON.parse(l); } catch (e) { return l; }
                        }
                        return l;
                    });
                    const leg = locData.find(l => l.name === 'Legazpi' || l === 'Legazpi')?.price;
                    const sor = locData.find(l => l.name === 'Sorsogon' || l === 'Sorsogon')?.price;
                    return { leg, sor };
                };

                // 1. Update Existing Items with Cloud Prices
                const updatedPrev = prev.map(localItem => {
                    const cloudItem = cloudMap.get(localItem.sku);
                    if (cloudItem) {
                        const { leg, sor } = getCloudPrices(cloudItem);
                        // Only update if cloud has prices (prevent overwriting with undefined if cloud is partial)
                        // But if 0, we should update.
                        const newLeg = leg !== undefined ? leg : localItem.priceLeg;
                        const newSor = sor !== undefined ? sor : localItem.priceSor;
                        return { ...localItem, priceLeg: newLeg, priceSor: newSor, description: cloudItem.description || localItem.description };
                    }
                    return localItem;
                });

                // 2. Add New Items
                const existingSkus = new Set(prev.map(i => i.sku));
                const newItems = inventory
                    .filter(i => !existingSkus.has(i.sku))
                    .filter(i => {
                        const prefix = i.sku.split('-')[0];
                        return !['FGT', 'OTH'].includes(prefix);
                    })
                    .map(i => {
                        const prefix = i.sku.split('-')[0];
                        const defaultPrice = CHRISTMAS_PRICES[prefix] || 0;
                        const { leg, sor } = getCloudPrices(i);
                        return {
                            sku: i.sku,
                            description: i.description,
                            category: prefix,
                            priceLeg: leg !== undefined ? leg : (i.price_leg || defaultPrice),
                            priceSor: sor !== undefined ? sor : (i.price_sor || (defaultPrice + (prefix === 'FGC' ? 1 : 5)))
                        };
                    });

                if (JSON.stringify(updatedPrev) !== JSON.stringify(prev) || newItems.length > 0) {
                    console.log("Synced menu with cloud (Updates + New Items)");
                    return [...updatedPrev, ...newItems];
                }
                return prev;
            });
        }
    }, [inventory]);

    const [resellerOrders, setResellerOrders] = useState([]);

    // --- Derived State: Merged Inventory ---
    // Combines Supabase inventory with local Menu Config items
    // Merged Inventory: STRICTLY based on menuConfig
    // We only show items that are explicitly defined in the Christmas Menu settings.
    const mergedInventory = useMemo(() => {
        return menuConfig.map(menuItem => {
            // Find stock/details from main inventory if exists
            const invItem = inventory.find(i => i.sku === menuItem.sku);
            return {
                ...menuItem,
                stockLeg: invItem?.stockLeg || 0,
                stockSor: invItem?.stockSor || 0,
                // Ensure price is from menuConfig logic (already in menuItem), 
                // but if missing, fallback to getPrice which handles hierarchy
                priceLeg: menuItem.priceLeg,
                priceSor: menuItem.priceSor
            };
        });
    }, [menuConfig, inventory]);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            const [inventoryRes, ordersRes] = await Promise.all([
                // 1. Fetch Inventory (Optimized columns)
                supabase
                    .from('inventory')
                    .select('sku, description, locations')
                    .order('sku', { ascending: true }),

                // 2. Fetch Orders (For History - Limited & Optimized)
                supabase
                    .from('reseller_orders')
                    .select('id, reseller_name, location, date, status, total_amount, items')
                    .eq('location', 'Christmas Order')
                    .order('date', { ascending: false })
                    .limit(20)
            ]);

            if (inventoryRes.data) setInventory(inventoryRes.data);
            if (ordersRes.data) setResellerOrders(ordersRes.data);
        };

        fetchData();
    }, []);

    // --- Dynamic Category Generation ---
    // Generate categories based on what items exist in mergedInventory
    const dynamicCategories = useMemo(() => {
        const uniquePrefixes = new Set(mergedInventory.map(i => i.sku.split('-')[0])); // Get content before first hyphen

        // Filter standard categories that exist
        const standardCats = STANDARD_CATEGORIES.filter(cat => uniquePrefixes.has(cat.id));

        // Create new categories for unknown prefixes
        const customPrefixes = [...uniquePrefixes].filter(p => !STANDARD_CATEGORIES.find(c => c.id === p));

        const customCats = customPrefixes.map(prefix => ({
            id: prefix,
            label: prefix, // Or try to derive a label
            icon: Sparkles, // Default icon
            color: 'bg-[#510813] text-white', // Default Value
            border: 'border-white/20',
            shadow: 'shadow-[#510813]/40',
            ring: 'ring-[#510813]'
        }));

        return [...standardCats, ...customCats];
    }, [mergedInventory]);



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
    const [contactNumber, setContactNumber] = useState(''); // Optional field
    // const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // REMOVED: Always pickup
    // const [address, setAddress] = useState(''); // REMOVED: No delivery
    const [scheduleDate, setScheduleDate] = useState('2025-12-31');
    const [scheduleTime, setScheduleTime] = useState('');

    // New Year: Location & Pricing State
    const [location, setLocation] = useState('Legazpi'); // 'Legazpi' | 'Sorsogon'

    // Default Menu Config (Prefix-based default prices)


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
                    setContactNumber(draft.contactNumber || ''); // Restore contact number
                }
            } catch (error) {
                console.error('Error restoring draft:', error);
                localStorage.removeItem(DRAFT_KEY);
            }
        }
    }, []);

    // Sync Local Menu to Supabase (Cloud)
    const syncMenuToCloud = async (currentMenu) => {
        if (!confirm("Upload local menu items to cloud? This makes them visible on other devices.")) return;

        if (!Array.isArray(currentMenu)) {
            if (!Array.isArray(currentMenu)) {
                showToast('Sync failed: Invalid menu configuration (not an array).', 'error');
                return;
            }
        }

        try {
            // 1. Identify SKUs to Upsert (Update/Insert)
            const itemsToUpsert = currentMenu.map(item => ({
                sku: item.sku,
                description: item.description,
                uom: 'Unit', // Default
                quantity: 0, // Default
                is_visible_in_reseller_order: true,
                // Store prices in locations JSONB as JSON Array of Objects
                // Explicitly stringify to ensure it fits into text[] column without corruption or type errors
                locations: [
                    JSON.stringify({ name: 'Legazpi', price: item.priceLeg || 0 }),
                    JSON.stringify({ name: 'Sorsogon', price: item.priceSor || 0 })
                ]
            }));

            // 2. Identify SKUs to Delete (Exists in Cloud, Missing Locally)
            // Fetch all items from cloud that match our managed prefixes
            const prefixes = ['FGC', 'FGP', 'FGL', 'FGG', 'FGCK', ...currentMenu.map(i => i.sku.split('-')[0])];
            const uniquePrefixes = [...new Set(prefixes)];

            // Should theoretically fetch all, but let's just fetch all and filter in JS to be safe/easy
            const { data: cloudItems, error: fetchError } = await supabase
                .from('inventory')
                .select('sku');

            if (fetchError) throw fetchError;

            const localSkus = new Set(currentMenu.map(i => i.sku));

            // Filter cloud items that match our known prefixes AND are NOT in local menu
            const skusToDelete = cloudItems
                .filter(i => {
                    const prefix = i.sku.split('-')[0];
                    return uniquePrefixes.includes(prefix) && !localSkus.has(i.sku);
                })
                .map(i => i.sku);

            console.log('Sync Upsert:', itemsToUpsert.length, 'items');
            console.log('Sync Delete:', skusToDelete.length, 'items', skusToDelete);

            // 3. Execute Operations
            const upsertPromise = supabase
                .from('inventory')
                .upsert(itemsToUpsert, { onConflict: 'sku' });

            const deletePromise = skusToDelete.length > 0
                ? supabase.from('inventory').delete().in('sku', skusToDelete)
                : Promise.resolve({ error: null });

            const [upsertRes, deleteRes] = await Promise.all([upsertPromise, deletePromise]);

            if (upsertRes.error) throw upsertRes.error;
            if (deleteRes.error) throw deleteRes.error;

            showToast(`Menu synced! Updated: ${itemsToUpsert.length}, Deleted: ${skusToDelete.length}. Refresh mobile to see changes.`, 'success');

        } catch (error) {
            console.error('Sync Error:', error);
            showToast('Sync failed: ' + (error.message || 'Unknown error'), 'error');
        }
    };

    // Cart State: { 'SKU-123': 50, 'SKU-456': 10 }
    const [cart, setCart] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [tempQuantities, setTempQuantities] = useState({}); // Buffer for modal inputs
    const [searchTerm, setSearchTerm] = useState('');

    // Settings Modal
    // const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Removed unused
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileCartExpanded, setIsMobileCartExpanded] = useState(false); // Mobile Cart Toggle // For Menu Settings
    const [isHistoryOpen, setIsHistoryOpen] = useState(false); // For History Modal
    const [editingOrderId, setEditingOrderId] = useState(null); // For Edit Mode

    // PIN Modal State
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinTarget, setPinTarget] = useState(null); // 'menu' | 'history'
    const [pinInput, setPinInput] = useState('');

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // --- State for Custom Modals & Submission ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    // --- Toast State ---
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // Auto-Save to localStorage
    useEffect(() => {
        if (Object.keys(cart).length > 0 || resellerName || contactNumber) {
            const draft = {
                cart,
                resellerName,
                contactNumber, // Include contact number in draft
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [cart, resellerName, contactNumber]);

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
            if (!resellerName.trim()) {
                showToast("Please enter your name first!", 'error');
                return;
            }
        }
        if (!scheduleDate || !scheduleTime) {
            if (!scheduleDate || !scheduleTime) {
                showToast("Please select pick up date and time first!", 'error');
                return;
            }
        }
        setActiveCategory(catId);
        const currentCatItems = {};
        inventory
            .filter(item => item.sku === catId || item.sku.startsWith(catId + '-'))
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
            if (sku === activeCategory || sku.startsWith(activeCategory + '-')) {
                delete newCart[sku];
            }
        });

        Object.entries(tempQuantities).forEach(([sku, qty]) => {
            if (qty > 0) {
                newCart[sku] = qty;
            }
        });

        setCart(newCart);
        setIsModalOpen(false); // Legacy/Redundant
        setActiveCategory(null); // Actually closes the modal
        setActiveCategory(null); // Actually closes the modal
        showToast('Changes saved successfully!', 'success');
    };

    // --- History / Settings Handlers ---
    const handleMenuClick = () => {
        setPinTarget('menu');
        setPinInput('');
        setIsPinModalOpen(true);
    };

    const handleHistoryClick = () => {
        setPinTarget('history');
        setPinInput('');
        setIsPinModalOpen(true);
    };

    const handlePinSubmit = () => {
        if (pinInput === '1234') {
            if (pinTarget === 'menu') setIsMenuOpen(true);
            if (pinTarget === 'history') setIsHistoryOpen(true);
            setIsPinModalOpen(false);
        } else {
            showToast('Incorrect PIN', 'error');
            setPinInput('');
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
        if (!resellerName.trim()) return showToast('Please enter your name', 'error');

        if (!scheduleDate || !scheduleTime) return showToast('Please select pick up date and time', 'error');

        if (Object.keys(cart).length === 0) return showToast('Cart is empty', 'error');

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
                const item = mergedInventory.find(i => i.sku === sku);
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
                        ...(contactNumber ? [{ name: "Contact Number", value: contactNumber, inline: true }] : []),
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
            showToast("An error occurred: " + error.message, 'error');
        }
    };

    // Save Menu Config
    const handleSaveMenu = (newMenu) => {
        setMenuConfig(newMenu);
    };

    // Filter items for Modal
    const modalItems = activeCategory
        ? mergedInventory
            .filter(item => item.isVisible !== false)
            .filter(item => item.sku === activeCategory || item.sku.startsWith(activeCategory + '-'))
            .filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        : [];

    return (
        <div className="fade-in min-h-[100dvh] md:h-screen flex flex-col bg-[#F5F5DC] md:overflow-hidden relative font-sans text-[#510813]">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            {/* Tropical BG Pattern */}
            <ChristmasPattern opacity={0.12} color="text-[#E5562E]" />

            {/* --- Top Bar --- */}
            <div className="bg-[#FEFCE8]/80 backdrop-blur-md px-4 md:px-8 py-4 md:py-6 z-10 flex flex-col-reverse md:flex-row justify-between items-center gap-4 md:gap-0 border-b border-[#510813]/10 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center w-full md:w-auto">
                    {/* Reseller Name Input */}
                    <input
                        type="text"
                        placeholder="Enter Your Name..."
                        value={resellerName}
                        onChange={e => setResellerName(e.target.value)}
                        className="w-full md:min-w-[250px] bg-white border-2 border-[#E5562E] text-[#510813] placeholder-[#510813]/40 px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-all outline-none focus:ring-4 ring-[#E5562E]/20 text-lg"
                    />
                    {/* Contact Number Input (Optional) */}
                    <input
                        type="tel"
                        placeholder="Contact Number (Optional)"
                        value={contactNumber}
                        onChange={e => setContactNumber(e.target.value)}
                        className="w-full md:min-w-[200px] bg-white border-2 border-[#510813]/20 text-[#510813] placeholder-[#510813]/40 px-6 py-3 rounded-full font-medium shadow-sm hover:shadow-md transition-all outline-none focus:ring-4 ring-[#510813]/10 text-lg"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">

                    {/* Location Dropdown - Custom */}
                    <CustomDropdown
                        value={location}
                        onChange={setLocation}
                        options={[
                            { value: 'Legazpi', label: 'SM Legazpi' },
                            { value: 'Sorsogon', label: 'SM Sorsogon' }
                        ]}
                    />

                    <div className="text-left md:text-right hidden md:block">
                        <h2 className="text-xl md:text-3xl font-black text-[#E5562E] tracking-tight flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl border border-[#E5562E]/10">
                            Happy New Year! 🎆
                        </h2>
                    </div>

                    {/* Admin Buttons */}
                    <div className="flex gap-2">
                        <button onClick={() => { setPinTarget('history'); setIsPinModalOpen(true); }} className="p-2 bg-[#510813]/5 text-[#510813] rounded-full hover:bg-[#510813]/10 transition-colors" title="History">
                            <ClipboardList size={20} />
                        </button>
                        <button onClick={() => { setPinTarget('menu'); setIsPinModalOpen(true); }} className="p-2 bg-[#510813]/5 text-[#510813] rounded-full hover:bg-[#510813]/10 transition-colors" title="Settings">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-0">

                {/* LEFT: Categories */}
                <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-64 md:pb-8 scrollbar-hide">

                    {/* Delivery / Pickup Section */}
                    <div className="mb-8 bg-[#FEFCE8] rounded-2xl p-6 border border-[#510813]/10 shadow-sm">

                        <div className="flex gap-4 items-end">
                            <div className="flex-[2]">
                                <label className="text-[#510813]/70 text-sm block mb-1 font-medium">Pick Up Date</label>
                                <select
                                    value={scheduleDate}
                                    onChange={e => setScheduleDate(e.target.value)}
                                    className="w-full bg-white border-2 border-[#510813]/10 h-14 px-3 rounded-xl text-lg font-bold text-[#510813] focus:border-[#E5562E] focus:outline-none transition-colors appearance-none cursor-pointer flex items-center"
                                >
                                    <option value="2025-12-31">Dec 31, Wed</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[#510813]/70 text-sm block mb-1 font-medium">Pick Up Time</label>
                                <select
                                    value={scheduleTime}
                                    onChange={e => setScheduleTime(e.target.value)}
                                    className="w-full bg-white border-2 border-[#510813]/10 h-14 px-3 rounded-xl text-lg font-bold text-[#510813] focus:border-[#E5562E] focus:outline-none transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="">Select time...</option>
                                    <option value="ANYTIME">ANYTIME (Flexible)</option>
                                    <option value="09:00">9:00 AM</option>
                                    <option value="10:00">10:00 AM</option>
                                    <option value="12:00">12:00 PM</option>
                                    <option value="14:00">2:00 PM</option>
                                    <option value="16:00">4:00 PM</option>
                                    <option value="18:00">6:00 PM</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {dynamicCategories.length > 0 ? (
                            dynamicCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`relative h-64 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group flex flex-col justify-between overflow-hidden text-left ${cat.color} ${cat.shadow}`}
                                >
                                    <cat.icon className="absolute -bottom-8 -right-8 opacity-20 rotate-[-15deg] transition-transform group-hover:rotate-0 group-hover:scale-110" size={160} />

                                    <div className="relative z-10 w-full h-full flex flex-col justify-between">
                                        <div className="flex justify-between items-start w-full">
                                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30">
                                                <cat.icon size={32} className="text-white drop-shadow-sm" />
                                            </div>
                                            <div className="bg-white text-[#510813] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                                {Object.keys(cart).filter(sku => sku.startsWith(cat.id)).length} Items
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-3xl font-black tracking-tight text-white mb-1 drop-shadow-md">{cat.label}</h3>
                                            <p className="text-white/80 font-medium text-sm">Tap to view items</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 opacity-50">
                                <p>Loading menu...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart (Floating on Desktop, Bottom Sheet on Mobile) */}
                <div className={`
                    fixed md:static bottom-0 left-0 right-0 z-40
                    bg-[#FEFCE8] border-t-2 md:border-l-2 border-[#510813]/10
                    md:w-[400px] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.05)]
                    transition-transform duration-300 md:translate-y-0
                    max-h-[85vh] rounded-t-2xl md:rounded-none
                `}>
                    <div className="p-4 md:p-8 flex-1 md:overflow-y-auto">
                        <div
                            className="flex items-center gap-3 mb-6 text-[#510813] cursor-pointer md:cursor-default"
                            onClick={() => setIsMobileCartExpanded(!isMobileCartExpanded)}
                        >
                            <ShoppingCart size={28} className="text-[#E5562E]" />
                            <h2 className="text-2xl font-black tracking-tighter">Your Order</h2>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="bg-[#E5562E] text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {Object.values(cart).reduce((a, b) => a + b, 0)} Items
                                </span>
                                <div className="md:hidden text-[#510813]/50">
                                    {isMobileCartExpanded ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
                                </div>
                            </div>
                        </div>

                        <div className={`${isMobileCartExpanded ? 'block' : 'hidden md:block'}`}>
                            {Object.keys(cart).length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-[#510813]/40 border-2 border-dashed border-[#510813]/10 rounded-2xl bg-white/50">
                                    <ShoppingBag size={48} className="mb-4 opacity-50" />
                                    <p className="font-bold">Cart is empty</p>
                                    <p className="text-sm">Start adding some treats!</p>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-24 md:pb-0">
                                    {Object.entries(cart).map(([sku, qty]) => {
                                        const item = mergedInventory.find(i => i.sku === sku);
                                        if (!item) return null;
                                        const price = location === 'Sorsogon' ? item.priceSor : item.priceLeg;

                                        // Determine Category Color for border
                                        const prefix = sku.split('-')[0];
                                        const categoryColor = dynamicCategories.find(c => c.id === prefix)?.color.split(' ')[0] || 'bg-gray-500';

                                        return (
                                            <div key={sku} className="group bg-white rounded-2xl p-4 shadow-sm border border-[#510813]/5 flex gap-4 items-center">
                                                <div className={`w-16 h-16 rounded-xl ${categoryColor} flex items-center justify-center shrink-0`}>
                                                    <span className="text-white font-bold text-xs">{sku.split('-')[1]}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-[#510813] truncate">{item.description}</h4>
                                                    <p className="text-[#E5562E] font-mono font-medium">₱{price}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-3 bg-[#FEFCE8] rounded-xl border border-[#510813]/10 p-1">
                                                        <button
                                                            onClick={() => updateCart(sku, -1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E5562E]/10 text-[#510813] transition-colors"
                                                        >
                                                            <Minus size={14} strokeWidth={3} />
                                                        </button>
                                                        <span className="font-bold text-lg w-4 text-center">{qty}</span>
                                                        <button
                                                            onClick={() => updateCart(sku, 1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E5562E]/10 text-[#510813] transition-colors"
                                                        >
                                                            <Plus size={14} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs font-bold text-[#510813]/50">₱{(price * qty).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Totals */}
                    <div className="p-4 pb-8 md:p-8 bg-white border-t border-[#510813]/5">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[#510813]/60 font-bold uppercase tracking-wider text-sm">Total Amount</span>
                            <span className="text-4xl font-black text-[#510813] tracking-tighter">
                                ₱{cartTotal.toLocaleString()}
                            </span>
                        </div>

                        <button
                            disabled={Object.keys(cart).length === 0 || !resellerName || isSubmitting || !scheduleDate}
                            onClick={() => setIsConfirmOpen(true)}
                            className="w-full py-4 bg-[#E5562E] text-white rounded-2xl font-black text-xl shadow-lg hover:shadow-[#E5562E]/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    {editingOrderId ? 'Update Order' : 'Place Order'}
                                    <ArrowRight size={24} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}

            {/* Item Selection Modal (Standardized) */}
            {activeCategory && (
                <div className="fixed inset-0 z-50 bg-[#510813]/80 backdrop-blur-sm flex md:items-center justify-end md:justify-center animate-in fade-in duration-200 p-4 md:p-0">
                    <div className="bg-[#F5F5DC] w-full md:w-[800px] h-[90vh] md:h-[80vh] rounded-t-2xl md:rounded-3xl shadow-2xl flex flex-col md:border border-white/20 overflow-hidden transform transition-all animate-in slide-in-from-bottom-10">
                        {/* Header */}
                        <div className={`p-6 ${dynamicCategories.find(c => c.id === activeCategory)?.color.split(' ')[0] || 'bg-gray-800'} text-white flex justify-between items-center shrink-0`}>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveCategory(null)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                                    <ArrowLeft size={24} />
                                </button>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight">{dynamicCategories.find(c => c.id === activeCategory)?.label}</h2>
                                    <p className="text-white/80 font-medium">Select items to add</p>
                                </div>
                            </div>
                            <div className="relative hidden md:block w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/20 text-white placeholder-white/50 pl-10 pr-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-white/50"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#FFF1B5] sticky top-0 z-10 shadow-sm text-[#510813]">
                                    <tr>
                                        <th className="p-4 text-xs font-bold uppercase tracking-wider">Description</th>
                                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-right">Price</th>
                                        <th className="p-4 text-xs font-bold uppercase tracking-wider w-32 text-center">Quantity</th>
                                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#510813]/10">
                                    {modalItems.map(item => {
                                        const priceVal = location === 'Sorsogon' ? item.priceSor : item.priceLeg;
                                        const price = typeof priceVal === 'number' ? priceVal : 0;
                                        const qty = tempQuantities[item.sku] || 0;
                                        const total = (qty || 0) * price;
                                        const isSelected = qty > 0;

                                        return (
                                            <tr key={item.sku} className={`hover:bg-[#FFF7E3] transition-colors ${isSelected ? 'bg-orange-50' : 'bg-white'}`}>
                                                <td className="p-4 align-middle">
                                                    <div className="font-bold text-[#510813] text-base">{item.description}</div>
                                                    <div className="text-xs text-[#510813]/60 font-mono mt-0.5">{item.sku}</div>
                                                </td>
                                                <td className="p-4 text-right align-middle text-sm font-bold text-[#510813]/80">
                                                    ₱{price.toLocaleString()}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex justify-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={tempQuantities[item.sku] === undefined ? '' : tempQuantities[item.sku]}
                                                            onChange={(e) => handleModalQuantityChange(item.sku, e.target.value)}
                                                            className={`w-20 p-2 text-center rounded-lg border-2 focus:ring-4 focus:ring-[#E5562E]/20 outline-none transition-all font-black text-lg ${isSelected ? 'border-[#E5562E] text-[#E5562E] bg-white' : 'border-[#510813]/20 focus:border-[#E5562E] text-[#510813] bg-gray-50'}`}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right align-middle font-black text-[#E5562E] text-lg">
                                                    {total > 0 && `₱${total.toLocaleString()}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {modalItems.length === 0 && (
                                <div className="text-center py-20 text-[#510813]/40">
                                    <p>No items found matching "{searchTerm}"</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-[#510813]/10 bg-white md:rounded-b-3xl shrink-0">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-center md:text-left w-full md:w-auto flex justify-between md:block items-center">
                                    <span className="text-sm font-bold text-[#510813]/60 block">Category Total</span>
                                    <span className="text-2xl font-black text-[#E5562E]">
                                        ₱{modalItems.reduce((sum, item) => {
                                            const priceVal = location === 'Sorsogon' ? item.priceSor : item.priceLeg;
                                            const price = typeof priceVal === 'number' ? priceVal : 0;
                                            return sum + ((tempQuantities[item.sku] || 0) * price);
                                        }, 0).toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setActiveCategory(null)}
                                        className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-[#510813]/70 hover:bg-[#510813]/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveModal}
                                        className="flex-1 md:flex-none px-8 py-3 bg-[#E5562E] text-white font-bold rounded-xl shadow-lg hover:bg-[#c03e1b] transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} />
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Confirmation Modal --- */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#F5F5DC] w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#E5562E] via-[#FF5A5F] to-[#E5562E]" />

                        <h3 className="text-2xl font-black text-[#510813] mb-2">{editingOrderId ? 'Update Order?' : 'Confirm Order?'}</h3>
                        <p className="text-[#510813]/80 mb-6">
                            Ready to send your order for <span className="font-bold text-[#E5562E]">{resellerName}</span>?
                        </p>

                        <div className="bg-[#FEFCE8] rounded-xl p-4 mb-6 border border-[#510813]/5">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-[#510813]/60">Items</span>
                                <span className="font-bold text-[#510813]">{Object.values(cart).reduce((a, b) => a + b, 0)}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="font-bold text-[#510813]">Total</span>
                                <span className="font-black text-[#E5562E]">₱{cartTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsConfirmOpen(false)}
                                className="py-4 rounded-xl font-bold text-[#510813]/70 hover:bg-[#510813]/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="py-4 rounded-xl bg-[#E5562E] text-white font-bold shadow-lg hover:shadow-xl hover:shadow-[#E5562E]/20 transition-all"
                            >
                                {isSubmitting ? 'Sending...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Success Modal --- */}
            {isSuccessOpen && (
                <div className="fixed inset-0 bg-[#510813]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-[#F5F5DC] rounded-3xl p-4 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 overflow-hidden border-2 border-[#E5562E]">
                        <div className="w-12 h-12 bg-[#FEFCE8] rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-[#E5562E]/20">
                            <CheckCircle size={24} className="text-[#E5562E]" />
                        </div>
                        <h3 className="text-xl font-black text-[#510813] mb-1">Order Submitted!</h3>

                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#510813]/10 my-3">
                            <img src="/gcash-payment-qr.png" alt="GCash QR Code" className="h-40 w-auto object-contain mx-auto rounded-lg mb-2" />
                            <p className="text-[#E5562E] font-bold text-sm">Scan to pay & send description screenshot to Messenger</p>
                        </div>

                        <div className="bg-[#FEFCE8] rounded-xl p-4 border border-[#510813]/10 text-left space-y-3 mb-4">
                            <div className="flex items-start gap-3">
                                <Sparkles className="text-[#510813] shrink-0 mt-0.5" size={18} />
                                <span className="text-[#510813] text-sm font-medium">Store Ice Cream Cake in Freezer</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="text-[#510813] shrink-0 mt-0.5" size={18} />
                                <span className="text-[#510813] text-sm font-medium">Don't forget to claim your order by December 31</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="text-[#510813] shrink-0 mt-0.5" size={18} />
                                <span className="text-[#510813] text-sm font-medium">Payment must be made the day the order is placed otherwise order is void</span>
                            </div>
                        </div>

                        <button onClick={() => { setIsSuccessOpen(false); navigate(0); }} className="w-full py-3 rounded-xl bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#c03e1b] text-sm">
                            Start New Order
                        </button>
                    </div>
                </div>
            )}

            {/* --- History Modal --- */}
            {isHistoryOpen && (
                <ErrorBoundary>
                    <ChristmasHistoryModal
                        orders={resellerOrders || []}
                        inventory={mergedInventory || []}
                        onClose={() => setIsHistoryOpen(false)}
                        onStatusChange={handleStatusChange}
                        onEdit={handleEditHistoryOrder}
                        onDelete={handleDeleteHistoryOrder}
                        isProcessing={false}
                    />
                </ErrorBoundary>
            )}

            {/* --- PIN Confirmation Modal --- */}
            {isPinModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#F5F5DC] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-12 h-12 bg-[#FEFCE8] rounded-full flex items-center justify-center mb-3">
                                <Settings size={24} className="text-[#510813]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#510813]">Admin Access</h3>
                            <p className="text-sm text-[#510813]/60">Please enter PIN to continue</p>
                        </div>
                        <input
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                            className="w-full text-center text-3xl font-mono tracking-widest py-3 border-2 border-[#510813]/20 bg-white rounded-xl focus:border-[#E5562E] outline-none mb-6 text-[#510813]"
                            placeholder="••••"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsPinModalOpen(false)}
                                className="py-3 font-bold text-[#510813]/70 hover:bg-[#510813]/5 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePinSubmit}
                                className="py-3 bg-[#E5562E] text-white font-bold rounded-xl hover:bg-[#c03e1b]"
                            >
                                Enter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Menu Settings Modal --- */}
            <ErrorBoundary>
                <ChristmasMenuSettings
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    menuConfig={menuConfig || []}
                    onSaveMenu={handleSaveMenu}
                    inventory={inventory}
                    onSync={syncMenuToCloud}
                />
            </ErrorBoundary>
        </div>
    );
};
export default ChristmasOrder;
