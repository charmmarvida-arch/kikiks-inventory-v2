import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
    Settings, X, Save, Package, Coffee, Droplet, Box as BoxIcon,
    ChevronRight, ShoppingCart, Search, AlertCircle, FileText, CheckCircle,
    Sun, Flower2, Leaf, Utensils, IceCream, Box, Grid,
    ShoppingBag, MapPin, DollarSign, Trash2, Plus, Edit2, Check
} from 'lucide-react';
import Toast from './Toast';

// --- Background Pattern Component ---
const TropicalPattern = ({ className, opacity = 0.2, color = "text-white" }) => {
    // Fixed positions for a scattered look
    const icons = [
        { Icon: Leaf, top: '5%', left: '5%', rot: '45deg', size: 64 },
        { Icon: Coffee, top: '15%', left: '25%', rot: '-12deg', size: 48 },
        { Icon: Sun, top: '10%', right: '10%', rot: '0deg', size: 80 },
        { Icon: Flower2, top: '35%', left: '80%', rot: '20deg', size: 56 },
        { Icon: IceCream, top: '45%', left: '10%', rot: '-25deg', size: 60 },
        { Icon: Utensils, top: '55%', right: '20%', rot: '15deg', size: 50 },
        { Icon: Leaf, top: '75%', left: '30%', rot: '130deg', size: 70 },
        { Icon: Coffee, top: '85%', right: '5%', rot: '10deg', size: 55 },
        { Icon: Sun, top: '90%', left: '15%', rot: '0deg', size: 40 },
        // Extra items for density
        { Icon: Flower2, top: '65%', left: '50%', rot: '-45deg', size: 55 },
        { Icon: IceCream, top: '25%', left: '60%', rot: '15deg', size: 45 },
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

// --- Category Configuration --- 
const CATEGORIES = [
    { id: 'FGC', label: 'Cups', icon: Coffee, color: 'bg-[#F49306] text-white', border: 'border-white/20', shadow: 'shadow-[#F49306]/40', ring: 'ring-[#F49306]' },
    { id: 'FGP', label: 'Pints', icon: IceCream, color: 'bg-[#FF5A5F] text-white', border: 'border-white/20', shadow: 'shadow-[#FF5A5F]/40', ring: 'ring-[#FF5A5F]' },
    { id: 'FGL', label: 'Liters', icon: Droplet, color: 'bg-[#888625] text-white', border: 'border-white/20', shadow: 'shadow-[#888625]/40', ring: 'ring-[#888625]' },
    { id: 'FGG', label: 'Gallons', icon: Box, color: 'bg-[#E5562E] text-white', border: 'border-white/20', shadow: 'shadow-[#E5562E]/40', ring: 'ring-[#E5562E]' },
    { id: 'FGT', label: 'Trays', icon: Grid, color: 'bg-[#510813] text-white', border: 'border-white/20', shadow: 'shadow-[#510813]/40', ring: 'ring-[#510813]' },
];

const LEGACY_MAIN_CATEGORIES = [
    { id: 'FGC', name: 'Cups', icon: Coffee, color: '#ff6b6b' },
    { id: 'FGP', name: 'Pints', icon: Droplet, color: '#4ecdc4' },
    { id: 'FGL', name: 'Liters', icon: Droplet, color: '#45b7d1' },
    { id: 'FGG', name: 'Gallons', icon: BoxIcon, color: '#96ceb4' },
    { id: 'FGT', name: 'Trays', icon: Package, color: '#ffeaa7' }
];

const OTHERS_CATEGORY = { id: 'OTHERS', name: 'Others', icon: Package, color: '#a8a8a8', label: 'Others', bgClass: 'bg-gray-500 text-white', shadowClass: 'shadow-gray-500/40' };

// Warehouse locations
const WAREHOUSE_LOCATIONS = ['FTF Manufacturing', 'Legazpi Storage'];

const TransferLocation = ({ isPublic = false }) => {
    const {
        inventory,
        legazpiInventory,
        kikiksLocations,
        locationSRPs,
        updateLocationCategoryPrices,
        addTransferOrder,
        addStock,
        addLegazpiStock,
        addLegazpiProduct,
        addSku,

        updateLegazpiProduct,
        deleteLegazpiProduct,
        updateSku,
        deleteSku,
        addKikiksLocation,
        updateKikiksLocation,
        deleteKikiksLocation,
        updateLocationSRP
    } = useInventory();

    // State declarations
    const [fromLocation, setFromLocation] = useState('FTF Manufacturing');
    const [toLocation, setToLocation] = useState('');
    const [quantities, setQuantities] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // UI State for Redesign
    const [activeCategory, setActiveCategory] = useState(null); // replaces selectedCategory
    const [isCartExpanded, setIsCartExpanded] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    // Location Details Picker State
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [activeSelectionField, setActiveSelectionField] = useState(null); // 'from' or 'to'
    const [locationSearchTerm, setLocationSearchTerm] = useState('');

    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingPriceLocation, setEditingPriceLocation] = useState(null);
    const [tempPrices, setTempPrices] = useState({});
    const [newItem, setNewItem] = useState({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });

    // Inventory Management State
    const [activeTab, setActiveTab] = useState('add'); // 'add' | 'manage'
    const [managementSearchTerm, setManagementSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    // --- LOGIC: Item Management ---
    const handleAddItem = async () => {
        if (!editingPriceLocation) return;
        try {
            if (editingItem) {
                // UPDATE
                if (editingPriceLocation === 'Legazpi Storage') {
                    await updateLegazpiProduct(editingItem.id, {
                        product_name: newItem.name,
                        flavor: newItem.flavor,
                        quantity: newItem.quantity,
                        unit: newItem.unit
                    });
                    alert('Item updated successfully');
                } else if (editingPriceLocation === 'FTF Manufacturing') {
                    await updateSku(editingItem.sku, {
                        sku: newItem.sku,
                        description: newItem.description,
                        uom: newItem.unit,
                        quantity: newItem.quantity
                    });
                    alert('Item updated successfully');
                }
                setEditingItem(null);
            } else {
                // ADD
                if (editingPriceLocation === 'Legazpi Storage') {
                    if (!newItem.name) return alert('Product Name is required');
                    await addLegazpiProduct({
                        product_name: newItem.name,
                        flavor: newItem.flavor,
                        quantity: newItem.quantity,
                        unit: newItem.unit
                    });
                    alert('Item added to Legazpi Storage');
                } else if (editingPriceLocation === 'FTF Manufacturing') {
                    if (!newItem.sku || !newItem.description) return alert('SKU and Description are required');
                    await addSku({
                        sku: newItem.sku,
                        description: newItem.description,
                        uom: newItem.unit,
                        quantity: 0
                    });
                    if (newItem.quantity > 0) {
                        await addStock(newItem.sku, newItem.quantity);
                    }
                    alert('Item added to Inventory');
                }
            }
            setNewItem({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });
            setActiveTab('manage');
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Failed to save item');
        }
    };

    const handleEditClick = (item) => {
        setEditingItem(item);
        if (editingPriceLocation === 'Legazpi Storage') {
            setNewItem({
                name: item.product_name,
                flavor: item.flavor || '',
                quantity: item.quantity,
                unit: item.unit,
                sku: '',
                description: ''
            });
        } else {
            setNewItem({
                name: '',
                flavor: '',
                quantity: item.quantity,
                unit: item.uom,
                sku: item.sku,
                description: item.description
            });
        }
        setActiveTab('add');
    };

    const handleDeleteClick = async (idOrSku) => {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
        try {
            if (editingPriceLocation === 'Legazpi Storage') {
                await deleteLegazpiProduct(idOrSku);
            } else {
                await deleteSku(idOrSku);
            }
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete item');
        }
    };

    const filteredManagementItems = useMemo(() => {
        if (!editingPriceLocation) return [];
        let items = [];
        if (editingPriceLocation === 'Legazpi Storage') items = legazpiInventory;
        else if (editingPriceLocation === 'FTF Manufacturing') items = inventory;

        if (!managementSearchTerm) return items;
        const lowerSearch = managementSearchTerm.toLowerCase();
        return items.filter(item => {
            if (editingPriceLocation === 'Legazpi Storage') {
                return item.product_name?.toLowerCase().includes(lowerSearch) || item.flavor?.toLowerCase().includes(lowerSearch);
            } else {
                return item.sku?.toLowerCase().includes(lowerSearch) || item.description?.toLowerCase().includes(lowerSearch);
            }
        });
    }, [editingPriceLocation, legazpiInventory, inventory, managementSearchTerm]);

    // --- LOGIC: Transfer ---

    // Get source inventory based on FROM location
    const sourceInventory = useMemo(() => {
        if (fromLocation === 'FTF Manufacturing') {
            return inventory;
        } else if (fromLocation === 'Legazpi Storage') {
            return legazpiInventory.map(item => ({
                sku: item.sku || `${item.product_name}-${item.flavor || 'Default'}`,
                description: `${item.product_name} ${item.flavor || ''}`.trim(),
                quantity: item.quantity,
                uom: item.unit,
                id: item.id
            }));
        }
        return [];
    }, [fromLocation, inventory, legazpiInventory]);

    // Get price for a product based on TO location
    const getPrice = (sku) => {
        if (!toLocation) return 0;
        if (WAREHOUSE_LOCATIONS.includes(toLocation)) return 0;
        return locationSRPs[toLocation]?.[sku] || 0;
    };

    const isBranch = toLocation && !WAREHOUSE_LOCATIONS.includes(toLocation);

    // Group products by category
    const productsByCategory = useMemo(() => {
        const grouped = {};
        const matchedSkus = new Set();

        CATEGORIES.forEach(cat => {
            const items = sourceInventory.filter(item =>
                item.sku?.startsWith(cat.id) || item.description?.toLowerCase().includes(cat.label.slice(0, -1).toLowerCase())
            );
            grouped[cat.id] = items;
            items.forEach(item => matchedSkus.add(item.sku));
        });

        grouped['OTHERS'] = sourceInventory.filter(item => !matchedSkus.has(item.sku));
        return grouped;
    }, [sourceInventory]);

    const visibleCategories = useMemo(() => {
        const cats = [...CATEGORIES];
        if (productsByCategory['OTHERS']?.length > 0) {
            cats.push({
                ...OTHERS_CATEGORY,
                label: 'Others',
                bgClass: 'bg-gray-500 text-white',
                shadowClass: 'shadow-gray-500/40',
                border: 'border-white/20',
                color: 'bg-gray-600 text-white'
            });
        }
        return cats.filter(cat => productsByCategory[cat.id]?.length > 0 || cat.id !== 'OTHERS');
    }, [productsByCategory]);

    // Cart Totals
    const grandTotals = useMemo(() => {
        let totalQty = 0;
        let totalValue = 0;
        let totalItems = 0;

        Object.entries(quantities).forEach(([sku, qty]) => {
            if (qty > 0) {
                totalItems++;
                totalQty += qty;
                totalValue += qty * getPrice(sku);
            }
        });

        return { totalItems, totalQty, totalValue };
    }, [quantities, toLocation, locationSRPs]);

    const handleQuantityChange = (sku, value) => {
        setQuantities(prev => ({
            ...prev,
            [sku]: value === '' ? 0 : parseInt(value) || 0
        }));
    };

    const sendDiscordNotification = async (orderData) => {
        const webhookUrl = import.meta.env.VITE_DISCORD_TRANSFER_WEBHOOK;
        if (!webhookUrl) return;

        try {
            const itemsList = Object.entries(orderData.items).map(([sku, qty]) => {
                const product = sourceInventory.find(p => p.sku === sku);
                const price = getPrice(sku);
                const value = qty * price;
                if (isBranch && price > 0) {
                    return `• ${product?.description || sku} - Qty: ${qty} (₱${price.toFixed(2)} each = ₱${value.toFixed(2)})`;
                }
                return `• ${product?.description || sku} - Qty: ${qty}`;
            }).join('\n');

            const embed = {
                title: '📦 New Transfer Location Order',
                color: 0x4ecdc4,
                fields: [
                    { name: '🏭 FROM Location', value: orderData.from_location, inline: true },
                    { name: '🏪 TO Location', value: orderData.destination, inline: true },
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: false },
                    { name: '📋 Items Transferred', value: itemsList || 'None', inline: false },
                    { name: '📊 Total Quantity', value: Object.values(orderData.items).reduce((sum, qty) => sum + qty, 0).toString(), inline: true }
                ],
                footer: { text: 'Kikiks Inventory System' },
                timestamp: new Date().toISOString()
            };
            if (isBranch && orderData.total_amount > 0) {
                embed.fields.push({ name: '💰 Total Value', value: `₱${orderData.total_amount.toFixed(2)}`, inline: true });
            }

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
        } catch (error) {
            console.error('Discord notification error:', error);
        }
    };

    const handleSubmitTransfer = async () => {
        if (isSubmitting) return;
        if (!fromLocation) return alert('Please select a FROM location');
        if (!toLocation) return alert('Please select a TO location');
        if (fromLocation === toLocation) return alert('FROM and TO locations cannot be the same');

        const transferItems = {};
        let hasItems = false;
        Object.entries(quantities).forEach(([sku, qty]) => {
            if (qty > 0) {
                transferItems[sku] = qty;
                hasItems = true;
            }
        });

        if (!hasItems) return alert('Please add at least one item to transfer');

        try {
            setIsSubmitting(true);
            const newOrder = {
                from_location: fromLocation,
                destination: toLocation,
                items: transferItems,
                total_amount: grandTotals.totalValue,
                status: 'Unread',
                type: 'Transfer'
            };

            await addTransferOrder(newOrder);
            sendDiscordNotification(newOrder).catch(console.error);
            setShowToast(true);
            setQuantities({});
            setToLocation('');
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Failed to submit transfer: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePriceChange = (prefix, value) => {
        setTempPrices(prev => ({ ...prev, [prefix]: value }));
    };

    const savePrices = () => {
        if (editingPriceLocation) {
            updateLocationCategoryPrices(editingPriceLocation, tempPrices);
            alert(`Prices updated for ${editingPriceLocation}`);
        }
    };

    // Get available TO locations
    const toLocationOptions = useMemo(() => {
        const allLocations = [...WAREHOUSE_LOCATIONS, ...kikiksLocations];
        const uniqueLocations = [...new Set(allLocations)]; // Dedup just in case
        return uniqueLocations.filter(loc => loc !== fromLocation);
    }, [fromLocation, kikiksLocations]);

    // Modal Item Display
    const modalItems = activeCategory
        ? productsByCategory[activeCategory]?.filter(item =>
            item.description.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(modalSearchTerm.toLowerCase())
        ) || []
        : [];

    // --- Helper for Modal Options Display ---
    const getModalOptions = () => {
        if (activeSelectionField === 'from') {
            // For Source, usually warehouses
            // We filter by search term if present
            return WAREHOUSE_LOCATIONS.filter(loc => loc.toLowerCase().includes(locationSearchTerm.toLowerCase()));
        } else if (activeSelectionField === 'to') {
            // For Destination, can be warehouse or branch
            return toLocationOptions.filter(loc => loc.toLowerCase().includes(locationSearchTerm.toLowerCase()));
        }
        return [];
    };

    const handleLocationSelect = (loc) => {
        if (activeSelectionField === 'from') {
            setFromLocation(loc);
            setQuantities({}); // Reset cart if source changes
        } else {
            setToLocation(loc);
        }
        setIsLocationModalOpen(false);
        setActiveSelectionField(null);
        setLocationSearchTerm('');
    };

    return (
        <div className="fade-in h-[100dvh] md:h-screen flex flex-col bg-[#F3EBD8] overflow-hidden relative">

            {/* Header / Top Bar */}
            <div className="bg-[#F3EBD8] px-4 md:px-8 py-4 md:py-6 z-10 flex flex-col-reverse md:flex-row justify-between items-center gap-4 md:gap-0">
                <div className="flex gap-4 items-center w-full md:w-auto">
                    {/* FROM SELECTOR (BUTTON) */}
                    <div className="relative group w-full md:w-auto flex flex-col items-start gap-1">
                        <label className="text-xs font-bold text-[#510813] opacity-60 ml-2">TRANSFER FROM</label>
                        <button
                            onClick={() => { setActiveSelectionField('from'); setIsLocationModalOpen(true); }}
                            className="flex items-center justify-between w-full md:min-w-[220px] bg-[#510813] text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-[#6a0a19] transition-all outline-none focus:ring-4 ring-[#E5562E]/30"
                        >
                            <span className="truncate max-w-[180px]">{fromLocation || 'Select Origin...'}</span>
                            <ChevronRight className="rotate-90 md:rotate-0 text-white/50" size={20} />
                        </button>
                    </div>

                    <div className="hidden md:block text-[#510813] font-black text-xl mt-6">→</div>

                    {/* TO SELECTOR (BUTTON) */}
                    <div className="relative group w-full md:w-auto flex flex-col items-start gap-1">
                        <label className="text-xs font-bold text-[#510813] opacity-60 ml-2">TRANSFER TO</label>
                        <button
                            onClick={() => { setActiveSelectionField('to'); setIsLocationModalOpen(true); }}
                            className="flex items-center justify-between w-full md:min-w-[220px] bg-white text-[#510813] px-6 py-3 rounded-full font-bold shadow-lg hover:bg-gray-50 transition-all outline-none focus:ring-4 ring-[#E5562E]/30 border-2 border-[#510813]/10"
                        >
                            <span className="truncate max-w-[180px]">{toLocation || 'Select Destination...'}</span>
                            <ChevronRight className="rotate-90 md:rotate-0 text-[#510813]/30" size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                        <h2 className="text-2xl md:text-4xl font-black text-[#510813] tracking-tight">TRANSFER</h2>
                        <p className="text-[#510813]/60 font-medium text-xs md:text-base">Move stock between locations</p>
                    </div>
                    {!isPublic && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-3 rounded-full bg-white text-[#510813] shadow-md hover:scale-110 transition-transform"
                            title="Location Settings"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* --- Content Area (Split Screen) --- */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                {/* LEFT: Categories */}
                <div className="flex-1 p-8 overflow-y-auto pb-40 md:pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {visibleCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`relative h-64 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#510813]/20 group flex flex-col justify-between overflow-hidden ${cat.color} ${cat.shadow || 'shadow-md'}`}
                            >
                                <cat.icon className="absolute -bottom-8 -right-8 opacity-20 rotate-[-15deg] transition-transform group-hover:rotate-0 group-hover:scale-110" size={160} />

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30">
                                        <cat.icon size={32} className="text-white drop-shadow-sm" />
                                    </div>
                                    <div className="bg-white text-[#510813] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {productsByCategory[cat.id]?.reduce((sum, item) => sum + (quantities[item.sku] > 0 ? 1 : 0), 0) || 0} In Cart
                                    </div>
                                </div>

                                <div className="relative z-10 text-left">
                                    <h4 className="text-3xl font-black tracking-wide drop-shadow-md">{cat.label || cat.name}</h4>
                                    <div className="text-white/80 font-medium mt-1">
                                        {productsByCategory[cat.id]?.reduce((sum, item) => sum + (item.quantity || 0), 0)} Available
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Sidebar / Cart */}
                <div className={`fixed bottom-0 left-0 right-0 md:static w-full md:w-[500px] z-50 flex flex-col transition-all duration-300 ease-in-out ${isCartExpanded ? 'h-[75vh]' : 'h-auto'} md:h-auto md:max-h-[38rem] p-3 md:py-4 md:pr-4 md:pl-0 pointer-events-none md:pointer-events-auto`}>
                    <div className="relative flex-1 flex flex-col drop-shadow-2xl pointer-events-auto">
                        <div className="relative z-10 flex-1 flex flex-col overflow-hidden bg-[#FFF1B5] rounded-2xl md:rounded-tl-[40px] md:rounded-bl-[40px] md:rounded-tr-2xl md:rounded-br-2xl border-4 border-white shadow-xl">
                            <TropicalPattern opacity={0.15} color="text-[#E5562E]" />

                            <div className="relative z-20 flex flex-col p-3 md:p-6 text-[#510813] text-left h-full pb-2 md:pb-6">
                                {/* Header */}
                                <div className={`flex-shrink-0 flex items-center gap-3 mb-4 md:mb-6 ${!isCartExpanded ? 'hidden md:flex' : 'flex'}`}>
                                    <div className="bg-[#E5562E] text-white p-2 md:p-3 rounded-2xl shadow-lg rotate-3">
                                        <ShoppingCart size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black tracking-tight">TRANSFER CART</h3>
                                        <p className="text-[#510813]/80 text-xs md:text-sm font-medium">{grandTotals.totalQty} Items selected</p>
                                    </div>
                                </div>

                                {/* Cart Items */}
                                <div className={`flex-1 min-h-0 overflow-y-auto space-y-3 pr-2 -mr-2 custom-scrollbar-orange ${!isCartExpanded ? 'hidden md:block' : 'block'}`}>
                                    {grandTotals.totalQty === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-[#510813]/40 border-2 border-dashed border-[#510813]/10 rounded-3xl p-6">
                                            <Box size={48} className="mb-4 opacity-50" />
                                            <p className="text-center font-bold">No items selected</p>
                                            <p className="text-center text-sm mt-2">Select a category on the left to add items.</p>
                                        </div>
                                    ) : (
                                        visibleCategories.map(cat => {
                                            const catProducts = productsByCategory[cat.id] || [];
                                            const itemsInCart = catProducts.filter(p => quantities[p.sku] > 0);

                                            if (itemsInCart.length === 0) return null;

                                            return (
                                                <div key={cat.id} className="bg-white shadow-sm border border-[#E5562E]/10 rounded-2xl p-3 md:p-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1 rounded-full ${cat.color.split(' ')[0]} text-white`}>
                                                                <cat.icon size={12} />
                                                            </div>
                                                            <span className="font-bold text-sm text-[#510813]">{cat.label || cat.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-[#510813]/80 pl-6 border-l-2 border-[#E5562E]/20 ml-2 space-y-1">
                                                        {itemsInCart.map(item => (
                                                            <div key={item.sku} className="flex justify-between py-1">
                                                                <span className="truncate w-32 font-medium">{item.description}</span>
                                                                <span className="font-bold">x{quantities[item.sku]}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Summary & Submit */}
                                <div className="flex-shrink-0 mt-auto pt-1 md:pt-3 border-t border-[#510813]/10 flex flex-col gap-1 md:gap-3">
                                    {/* Mobile Toggle */}
                                    <button onClick={() => setIsCartExpanded(!isCartExpanded)} className="md:hidden w-full flex items-center justify-center py-1">
                                        <div className="w-12 h-1 bg-[#510813]/20 rounded-full"></div>
                                    </button>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl">
                                            <span className="font-bold text-[#510813]">Total Items</span>
                                            <span className="font-black text-xl text-[#510813]">{grandTotals.totalQty}</span>
                                        </div>

                                        {isBranch && (
                                            <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl">
                                                <span className="font-bold text-[#510813]">Total Value</span>
                                                <span className="font-black text-xl text-[#E5562E]">₱{grandTotals.totalValue.toLocaleString()}</span>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleSubmitTransfer}
                                            disabled={!toLocation || grandTotals.totalQty === 0 || isSubmitting}
                                            className="w-full bg-[#E5562E] hover:bg-[#c94925] text-white py-4 rounded-xl font-black text-xl shadow-lg shadow-[#E5562E]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isSubmitting ? (
                                                <span>Transmitting...</span>
                                            ) : (
                                                <>
                                                    <FileText size={20} strokeWidth={3} />
                                                    <span>CONFIRM TRANSFER</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SKU Selection Modal (Quantity) --- */}
            {activeCategory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
                    <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4" onClick={() => setActiveCategory(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${CATEGORIES.find(c => c.id === activeCategory)?.color.split(' ')[0] || 'bg-[#510813]'}`}>
                                <div className="text-white">
                                    <h3 className="text-2xl font-bold">Select {CATEGORIES.find(c => c.id === activeCategory)?.label || 'Items'}</h3>
                                    <p className="text-sm opacity-80">Availabilities based on {fromLocation}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search items..."
                                            value={modalSearchTerm}
                                            onChange={e => setModalSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 rounded-full border-none bg-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none text-sm"
                                        />
                                    </div>
                                    <button onClick={() => setActiveCategory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Item Description</th>
                                            {isBranch && <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Price (SRP)</th>}
                                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">In Stock</th>
                                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center w-32">Transfer Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {modalItems.map(item => {
                                            const price = getPrice(item.sku);
                                            const qty = quantities[item.sku] || 0;
                                            const isSelected = qty > 0;

                                            return (
                                                <tr key={item.sku} className={`hover:bg-[#F3EBD8]/30 transition-colors ${isSelected ? 'bg-[#F3EBD8]/50' : ''}`}>
                                                    <td className="p-4 align-middle">
                                                        <div className="font-bold text-[#510813] text-lg">{item.description}</div>
                                                        <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
                                                    </td>
                                                    {isBranch && (
                                                        <td className="p-4 text-right align-middle text-sm font-bold text-gray-600">
                                                            ₱{price.toLocaleString()}
                                                        </td>
                                                    )}
                                                    <td className="p-4 text-center align-middle">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {item.quantity} {item.uom}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={item.quantity}
                                                                value={quantities[item.sku] === undefined || quantities[item.sku] === 0 ? '' : quantities[item.sku]}
                                                                onChange={(e) => handleQuantityChange(item.sku, e.target.value)}
                                                                className={`w-24 p-2 text-center rounded-lg border-2 focus:ring-4 focus:ring-[#E5562E]/20 outline-none transition-all font-black text-xl ${isSelected ? 'border-[#E5562E] text-[#E5562E] bg-white' : 'border-gray-200 bg-gray-50'}`}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {modalItems.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="p-12 text-center text-gray-400">No items found matching category or search.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setActiveCategory(null)}
                                    className="px-8 py-3 rounded-xl bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#d4451d] transition-all flex items-center gap-2"
                                >
                                    <CheckCircle size={20} />
                                    <span>Done Selecting</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOCATION SELECTION MODAL (NEW) --- */}
            {isLocationModalOpen && (
                <div className="fixed inset-0 bg-[#510813]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#F3EBD8] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden relative">
                        {/* Modal Header */}
                        <div className="p-4 md:p-8 pb-2 md:pb-4">
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#510813]">
                                        {activeSelectionField === 'from' ? 'Select Origin' : 'Select Destination'}
                                    </h2>
                                    <p className="text-[#510813]/60 font-medium text-xs md:text-base">
                                        {activeSelectionField === 'from' ? 'Where are goods coming from?' : 'Where are goods going to?'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setIsLocationModalOpen(false); setActiveSelectionField(null); }}
                                    className="p-2 hover:bg-[#510813]/10 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-[#510813]" />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-[#510813]/40" size={20} />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search location..."
                                    value={locationSearchTerm}
                                    onChange={(e) => setLocationSearchTerm(e.target.value)}
                                    className="w-full bg-white pl-12 md:pl-16 pr-6 py-3 md:py-5 rounded-2xl text-base md:text-xl font-bold text-[#510813] placeholder-[#510813]/30 shadow-inner focus:outline-none focus:ring-4 ring-[#E5562E]/30"
                                />
                            </div>
                        </div>

                        {/* Modal Grid Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {getModalOptions().map((loc, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleLocationSelect(loc)}
                                        className="group relative bg-white p-4 md:p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 border-2 border-transparent hover:border-[#E5562E] text-left"
                                    >
                                        <div className="flex items-center gap-3 md:gap-4">
                                            {/* Avatar / Icon */}
                                            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center text-sm md:text-xl font-black text-white shadow-md ${['bg-[#E5562E]', 'bg-[#F49306]', 'bg-[#888625]', 'bg-[#FF5A5F]', 'bg-[#510813]'][idx % 5]
                                                }`}>
                                                {loc.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-[#510813] text-sm md:text-lg truncate group-hover:text-[#E5562E] transition-colors">{loc}</h4>
                                                <p className="text-[10px] md:text-xs text-gray-500 font-medium">
                                                    {WAREHOUSE_LOCATIONS.includes(loc) ? 'Warehouse / Factory' : 'Branch Store'}
                                                </p>
                                            </div>
                                            <ChevronRight className="opacity-0 group-hover:opacity-100 text-[#E5562E] transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                                {getModalOptions().length === 0 && (
                                    <div className="col-span-full py-12 text-center opacity-50">
                                        <p className="font-bold text-xl">No locations found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isSettingsOpen && <LocationSettingsModal onClose={() => setIsSettingsOpen(false)} />}

            {showToast && <Toast message="Transfer Successful!" onClose={() => setShowToast(false)} duration={4000} />}
        </div>
    );
};


// --- NEW LOCATION SETTINGS MODAL (Replaces old inline modal) ---
function LocationSettingsModal({ onClose }) {
    const {
        kikiksLocations, addKikiksLocation, updateKikiksLocation, deleteKikiksLocation,
        locationSRPs, updateLocationCategoryPrices,
        inventory, legazpiInventory,
        addStock, addLegazpiStock, addLegazpiProduct, addSku,
        updateLegazpiProduct, deleteLegazpiProduct, updateSku, deleteSku
    } = useInventory();

    const [activeTab, setActiveTab] = useState('locations'); // locations, pricing, inventory

    const TABS = [
        { id: 'locations', label: 'Locations', icon: MapPin },
        { id: 'pricing', label: 'Price List', icon: DollarSign },
        { id: 'inventory', label: 'Inventory (Warehouses)', icon: BoxIcon },
    ];

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 60 }}>
            <div className="modal-content large-modal flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw' }}>
                {/* Header */}
                <div className="modal-header border-b border-gray-100 p-4 shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="modal-title flex items-center gap-2 text-xl font-bold text-[#510813]">
                            Location Management
                        </h3>
                        <button className="close-btn p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm whitespace-nowrap
                                        ${isActive
                                            ? 'bg-[#E5562E] text-white shadow-md'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="modal-body p-0 flex-1 overflow-y-auto bg-gray-50/50">
                    {activeTab === 'locations' && <LocationsTab locations={kikiksLocations} addLocation={addKikiksLocation} updateLocation={updateKikiksLocation} deleteLocation={deleteKikiksLocation} />}
                    {activeTab === 'pricing' && <PricingTab locations={kikiksLocations} locationSRPs={locationSRPs} updatePrices={updateLocationCategoryPrices} />}
                    {activeTab === 'inventory' && <InventoryTab
                        warehouses={WAREHOUSE_LOCATIONS}
                        legazpiInventory={legazpiInventory}
                        inventory={inventory}
                        actions={{ addLegazpiProduct, updateLegazpiProduct, deleteLegazpiProduct, addSku, updateSku, deleteSku, addStock }}
                    />}
                </div>
            </div>
        </div>
    );
}

// Sub-components for Tabs
const LocationsTab = ({ locations, addLocation, updateLocation, deleteLocation }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingLoc, setEditingLoc] = useState(null);
    const [formData, setFormData] = useState({ name: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (editingLoc) {
            await updateLocation(editingLoc, formData.name);
        } else {
            await addLocation(formData.name);
        }
        resetForm();
    };

    const handleEdit = (loc) => {
        setFormData({ name: loc });
        setEditingLoc(loc);
        setIsAdding(true);
    };

    const handleDelete = async (loc) => {
        if (window.confirm(`Delete ${loc}?`)) await deleteLocation(loc);
    };

    const resetForm = () => {
        setFormData({ name: '' });
        setEditingLoc(null);
        setIsAdding(false);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-lg text-gray-800">Branch Locations</h4>
                    <p className="text-sm text-gray-500">Manage your branch locations</p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2 bg-[#510813] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#3d060e] transition-colors">
                        <Plus size={16} /> Add Branch
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Location Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ name: e.target.value })}
                                placeholder="e.g. Area 3"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={resetForm} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" className="p-2 bg-[#E5562E] text-white rounded-lg hover:bg-[#c94b28] font-medium flex items-center gap-2 px-4">
                                <Check size={16} /> Save
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4 rounded-tl-xl">Location Name</th>
                            <th className="p-4 text-center rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {locations.map((loc, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900">{loc}</td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleEdit(loc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(loc)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PricingTab = ({ locations, locationSRPs, updatePrices }) => {
    const handlePriceChange = async (location, prefix, value) => {
        // We only have updateLocationCategoryPrices (batch) exposed easily in this context
        // So we create a small object { [prefix]: value }
        if (!value && value !== 0) return;
        await updatePrices(location, { [prefix]: Number(value) });
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h4 className="font-bold text-lg text-gray-800">Price List Configuration</h4>
                <p className="text-sm text-gray-500">Set unit prices for each location and product type</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[#510813] text-white text-xs font-semibold uppercase">
                        <tr>
                            <th className="p-4 rounded-tl-xl min-w-[150px]">Location</th>
                            {LEGACY_MAIN_CATEGORIES.map((cat, idx) => (
                                <th key={cat.id} className={`p-4 text-center min-w-[100px] ${idx === LEGACY_MAIN_CATEGORIES.length - 1 ? 'rounded-tr-xl' : ''}`}>
                                    {cat.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {locations.map((loc, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 font-bold text-gray-800 border-r border-gray-100 sticky left-0 bg-white">{loc}</td>
                                {LEGACY_MAIN_CATEGORIES.map(cat => {
                                    // Get price for a representative SKU of this category (e.g. FGC-001) or store by prefix
                                    // The data structure locationSRPs is { location: { sku: price } }
                                    // To display a "Category Price", we need to find one SKU of that category and show its price
                                    // Or rely on the fact that updateLocationCategoryPrices updates ALL.
                                    // WE NEED TO FIND A PRICE.
                                    const representativeSku = `${cat.id}-001`; // Approximation
                                    const prices = locationSRPs[loc] || {};
                                    // Find any sku starting with cat.id
                                    const foundSku = Object.keys(prices).find(k => k.startsWith(cat.id));
                                    const price = foundSku ? prices[foundSku] : 0;

                                    return (
                                        <td key={cat.id} className="p-3">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₱</span>
                                                <input
                                                    type="number"
                                                    defaultValue={price}
                                                    onBlur={(e) => handlePriceChange(loc, cat.id, e.target.value)}
                                                    className="w-full pl-6 pr-2 py-1.5 text-right border rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#E5562E] outline-none transition-all bg-white border-gray-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-xs text-center text-gray-400">
                Changes are saved automatically when you click outside the field.
            </p>
        </div>
    );
};

const InventoryTab = ({ warehouses, legazpiInventory, inventory, actions }) => {
    const [selectedWarehouse, setSelectedWarehouse] = useState(warehouses[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });

    // Filter Items
    const filteredItems = useMemo(() => {
        let items = [];
        if (selectedWarehouse === 'Legazpi Storage') items = legazpiInventory;
        else if (selectedWarehouse === 'FTF Manufacturing') items = inventory;

        if (!searchTerm) return items;
        return items.filter(i => {
            if (selectedWarehouse === 'Legazpi Storage') {
                return i.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
            } else {
                return i.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || i.description?.toLowerCase().includes(searchTerm.toLowerCase());
            }
        });
    }, [selectedWarehouse, legazpiInventory, inventory, searchTerm]);

    const handleSave = async () => {
        try {
            if (selectedWarehouse === 'Legazpi Storage') {
                const data = { product_name: newItem.name, flavor: newItem.flavor, quantity: newItem.quantity, unit: newItem.unit };
                if (editingItem) await actions.updateLegazpiProduct(editingItem.id, data);
                else await actions.addLegazpiProduct(data);
            } else {
                const data = { sku: newItem.sku || editingItem.sku, description: newItem.description, uom: newItem.unit, quantity: newItem.quantity };
                if (editingItem) await actions.updateSku(editingItem.sku, data);
                else {
                    await actions.addSku({ ...data, quantity: 0 }); // SKU first
                    if (data.quantity > 0) await actions.addStock(data.sku, data.quantity);
                }
            }
            setIsAdding(false);
            setEditingItem(null);
            setNewItem({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });
            alert('Saved successfully!');
        } catch (e) {
            console.error(e);
            alert('Error saving item');
        }
    };

    const startEdit = (item) => {
        setEditingItem(item);
        if (selectedWarehouse === 'Legazpi Storage') {
            setNewItem({ name: item.product_name, flavor: item.flavor, quantity: item.quantity, unit: item.unit });
        } else {
            setNewItem({ sku: item.sku, description: item.description, quantity: item.quantity, unit: item.uom });
        }
        setIsAdding(true);
    };

    const handleDelete = async (item) => {
        if (!window.confirm('Delete item?')) return;
        if (selectedWarehouse === 'Legazpi Storage') await actions.deleteLegazpiProduct(item.id);
        else await actions.deleteSku(item.sku);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-lg text-gray-800">Inventory Management</h4>
                    <p className="text-sm text-gray-500">Manage stock items for your warehouses</p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2 bg-[#510813] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#3d060e] transition-colors">
                        <Plus size={16} /> Add Item
                    </button>
                )}
            </div>

            {/* Warehouse Filter Pills */}
            <div className="flex gap-2 mb-6">
                {warehouses.map(w => (
                    <button
                        key={w}
                        onClick={() => setSelectedWarehouse(w)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedWarehouse === w
                            ? 'bg-[#510813] text-white shadow-md'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {w}
                    </button>
                ))}
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {selectedWarehouse === 'Legazpi Storage' ? (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Product Name</label>
                                    <input className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-[#E5562E]" placeholder="e.g. Tray 150g" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Flavor</label>
                                    <input className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-[#E5562E]" placeholder="Optional" value={newItem.flavor} onChange={e => setNewItem({ ...newItem, flavor: e.target.value })} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">SKU</label>
                                    <input className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-[#E5562E]" placeholder="e.g. FGT-001" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} disabled={!!editingItem} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Description</label>
                                    <input className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-[#E5562E]" placeholder="e.g. Tray 150g Vanilla" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                                </div>
                            </>
                        )}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Quantity</label>
                            <input type="number" className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-[#E5562E]" placeholder="0" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Unit</label>
                            <select className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-[#E5562E]" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                                <option value="PCS">PCS</option>
                                <option value="GRM">GRM</option>
                                <option value="KGS">KGS</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="p-2 bg-[#E5562E] text-white rounded-lg hover:bg-[#c94b28] font-medium flex items-center gap-2 px-4">
                            <Check size={16} /> Save
                        </button>
                        <button onClick={() => setIsAdding(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                    </div>
                </div>
            )}

            <input
                className="w-full p-2 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-[#510813] outline-none"
                placeholder="Search items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4 rounded-tl-xl w-1/2">Item Description</th>
                            <th className="p-4 w-1/4">SKU / ID</th>
                            <th className="p-4 w-1/4">Quantity</th>
                            <th className="p-4 text-center rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900">{selectedWarehouse === 'Legazpi Storage' ? `${item.product_name} ${item.flavor || ''}` : item.description}</td>
                                <td className="p-4 text-gray-500 text-sm">{selectedWarehouse === 'Legazpi Storage' ? item.id : item.sku}</td>
                                <td className="p-4 font-bold text-[#510813]">{item.quantity} {item.unit || item.uom}</td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => startEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">No items found in {selectedWarehouse}.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransferLocation;
