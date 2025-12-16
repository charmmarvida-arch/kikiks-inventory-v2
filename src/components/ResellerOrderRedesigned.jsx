import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Settings, Search, ShoppingCart,
    Coffee, IceCream, Droplet, Box, Grid,
    ChevronRight, Save, X, Trash2, AlertCircle, FileText, CheckCircle, Loader2,
    Sun, Flower2, Leaf, Utensils // Added for pattern
} from 'lucide-react';
import ResellerSettingsModal from './ResellerSettingsModal';
import { generatePackingList } from '../utils/pdfGenerator';

// --- Background Pattern Component (Now White/Transparent for Colored Backgrounds) ---
const TropicalPattern = ({ className, opacity = 0.2 }) => {
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
                    className="absolute text-white"
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

// Category Configuration - SOLID COLOR BLOCK STYLE
const CATEGORIES = [
    { id: 'FGC', label: 'Cups', icon: Coffee, color: 'bg-[#F49306] text-white', border: 'border-white/20', shadow: 'shadow-[#F49306]/40', ring: 'ring-[#F49306]' },
    { id: 'FGP', label: 'Pints', icon: IceCream, color: 'bg-[#FF5A5F] text-white', border: 'border-white/20', shadow: 'shadow-[#FF5A5F]/40', ring: 'ring-[#FF5A5F]' },
    { id: 'FGL', label: 'Liters', icon: Droplet, color: 'bg-[#888625] text-white', border: 'border-white/20', shadow: 'shadow-[#888625]/40', ring: 'ring-[#888625]' },
    { id: 'FGG', label: 'Gallons', icon: Box, color: 'bg-[#E5562E] text-white', border: 'border-white/20', shadow: 'shadow-[#E5562E]/40', ring: 'ring-[#E5562E]' },
    { id: 'FGT', label: 'Trays', icon: Grid, color: 'bg-[#510813] text-white', border: 'border-white/20', shadow: 'shadow-[#510813]/40', ring: 'ring-[#510813]' }
];

const ResellerOrderRedesigned = ({ isPublic = false }) => {
    const { inventory, resellers, addResellerOrder, updateResellerOrder, resellerOrders, resellerZones, resellerPrices, zonePrices } = useInventory();
    const navigate = useNavigate();
    const { orderId } = useParams();

    // --- State ---
    const [selectedResellerId, setSelectedResellerId] = useState('');
    const [address, setAddress] = useState('');

    // Auto-Save State
    const [lastSaved, setLastSaved] = useState(null);
    const [showDraftNotification, setShowDraftNotification] = useState(false);
    const [isDraftRestored, setIsDraftRestored] = useState(false);
    const DRAFT_KEY = 'kikiks-order-draft';

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

    // Auto-Restore Draft on Mount
    useEffect(() => {
        if (!orderId) {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    if (draft.cart && Object.keys(draft.cart).length > 0) {
                        setCart(draft.cart);
                        setSelectedResellerId(draft.selectedResellerId || '');
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
        }
    }, [orderId]);

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

    // --- State for Custom Modals & Submission ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalConfirmOpen, setIsFinalConfirmOpen] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState(null);

    // Auto-Save to localStorage
    useEffect(() => {
        if (!orderId && (Object.keys(cart).length > 0 || selectedResellerId || address)) {
            const draft = {
                cart,
                selectedResellerId,
                address,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            setLastSaved(new Date());
        }
    }, [cart, selectedResellerId, address, orderId]);

    // Browser Navigation Warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!orderId && Object.keys(cart).length > 0) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [cart, orderId]);

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
        // EXCEPTION: Private Individuals / Walk-ins can order any quantity
        const isPrivateIndividual = currentZone && (
            currentZone.name.toLowerCase().includes('private') ||
            currentZone.name.toLowerCase().includes('walk-in')
        );

        if (!isPrivateIndividual) {
            const fgcItems = Object.entries(cart).filter(([sku]) => sku.startsWith('FGC'));
            for (const [sku, qty] of fgcItems) {
                if (qty % 10 !== 0) {
                    return alert(`Order for ${sku} must be in multiples of 10 (e.g., 10, 20, 30). Current: ${qty}`);
                }
            }
        }

        setIsConfirmOpen(true);
    };

    const handleFinalSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Prepare Order Data
            const orderItems = {};
            let orderTotalQuantity = 0;
            Object.entries(cart).forEach(([sku, qty]) => {
                if (qty > 0) {
                    orderItems[sku] = qty;
                    orderTotalQuantity += qty;
                }
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

            let finalOrderId = orderId;
            let submissionError = null;

            // Save to DB
            if (orderId) {
                // Update Existing Order
                const res = await updateResellerOrder(orderId, {
                    ...orderData,
                    id: orderId,
                    status: 'Pending'
                });
                if (res && res.error) submissionError = res.error;
            } else {
                // Create New Order
                const newOrderId = crypto.randomUUID();
                orderData.id = newOrderId;
                finalOrderId = newOrderId;
                const res = await addResellerOrder(orderData);
                if (res && res.error) submissionError = res.error;
            }

            if (submissionError) {
                throw new Error(submissionError.message || "Database Error");
            }

            // --- EMAIL NOTIFICATION LOGIC ---
            if (finalOrderId && selectedReseller && selectedReseller.email) {
                try {
                    // 1. Generate PDF Base64
                    // Construct precise pricing map for PDF using current zone/reseller settings
                    const pdfPrices = {};
                    const locationName = currentZone ? currentZone.name : (orderData.location || 'Unknown');
                    pdfPrices[locationName] = {};

                    // Populate prices for this location using the getPrice helper which handles Zone/Reseller logic
                    ['FGC', 'FGP', 'FGL', 'FGG', 'FGT'].forEach(prefix => {
                        // We use a dummy SKU to trigger the prefix logic in getPrice
                        pdfPrices[locationName][prefix] = getPrice(prefix + '-000');
                    });

                    const pdfDataUri = await generatePackingList({
                        ...orderData,
                        id: finalOrderId, // Ensure ID is passed
                        returnBase64: true,
                        skipLogo: true
                    }, inventory, pdfPrices);

                    // 2. Send to API
                    fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: selectedReseller.email,
                            subject: `New Order Receipt - ${selectedReseller.name}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                                    <h1 style="color: #510813; border-bottom: 2px solid #E5562E; padding-bottom: 10px;">Order Confirmation</h1>
                                    <p>Hi <strong>${selectedReseller.name}</strong>,</p>
                                    <p>Thank you for your order! We have received your request and it is now being processed.</p>
                                    
                                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <h3 style="margin-top: 0; color: #510813;">Order Details</h3>
                                        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${finalOrderId.slice(0, 8)}</p>
                                        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                                        <p style="margin: 5px 0;"><strong>Location:</strong> ${currentZone ? currentZone.name : 'N/A'}</p>
                                    </div>

                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                        <thead>
                                            <tr style="background-color: #510813; color: white;">
                                                <th style="padding: 10px; text-align: left; border-radius: 6px 0 0 6px;">Product</th>
                                                <th style="padding: 10px; text-align: center;">Qty</th>
                                                <th style="padding: 10px; text-align: right;">Price</th>
                                                <th style="padding: 10px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${Object.entries(orderItems).map(([sku, qty]) => {
                                const item = inventory.find(i => i.sku === sku);
                                const description = item ? item.description : sku;
                                const price = getPrice(sku);
                                const total = price * qty;
                                return `
                                                    <tr style="border-bottom: 1px solid #eee;">
                                                        <td style="padding: 10px;">
                                                            <div style="font-weight: bold;">${description}</div>
                                                            <div style="font-size: 12px; color: #666;">${sku}</div>
                                                        </td>
                                                        <td style="padding: 10px; text-align: center;">${qty}</td>
                                                        <td style="padding: 10px; text-align: right;">₱${price.toLocaleString()}</td>
                                                        <td style="padding: 10px; text-align: right; font-weight: bold;">₱${total.toLocaleString()}</td>
                                                    </tr>
                                                `;
                            }).join('')}
                                        </tbody>
                                        <tfoot>
                                            <tr style="background-color: #f9fafb;">
                                                <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold;">Grand Total:</td>
                                                <td style="padding: 15px; text-align: right; font-weight: bold; color: #E5562E; font-size: 18px;">₱${cartTotal.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <p>Please find the official receipt attached as a PDF.</p>
                                    
                                    <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
                                        <p>Kikik's Inventory System<br/> Automated Notification</p>
                                    </div>
                                </div>
                            `,
                            attachments: [
                                {
                                    filename: `Order_${finalOrderId.slice(0, 8)}.pdf`,
                                    content: pdfDataUri.split(',')[1], // Remove data URL prefix
                                    encoding: 'base64'
                                }
                            ]
                        })
                    }).then(async res => {
                        const result = await res.json();
                        if (res.ok) {
                            console.log('Email sent successfully');
                        } else {
                            console.error('Failed to send email', result);
                        }
                    }).catch(err => {
                        console.error('Error sending email:', err);
                    });

                } catch (emailErr) {
                    console.error("Email sequence failed:", emailErr);
                    // Don't block success state on email fail
                }
            }

            // Success State
            setCreatedOrderId(finalOrderId);
            localStorage.removeItem(DRAFT_KEY); // Clear draft
            setIsFinalConfirmOpen(false); // Close Confirmation Modal
            setIsConfirmOpen(false); // Close Summary Modal
            setIsSubmitting(false); // Stop loading
            setIsSuccessOpen(true); // Open Success Modal

        } catch (error) {
            console.error("Order Submission Critical Error:", error);
            setIsSubmitting(false);
            // Alert is already handled by InventoryContext for DB errors, but for safety:
            if (!error.message.includes("Failed to save order")) {
                alert("An unexpected error occurred: " + error.message);
            }
        }
    };

    const handleSuccessDismiss = () => {
        setIsSuccessOpen(false);
        if (createdOrderId) {
            navigate(`/order-pdf/${createdOrderId}`);
        } else {
            // Fallback
            navigate('/reseller-orders');
        }
    };

    const handleClearDraft = () => {
        if (window.confirm('Are you sure you want to clear the current draft? This action cannot be undone.')) {
            setCart({});
            setSelectedResellerId('');
            setAddress('');
            localStorage.removeItem(DRAFT_KEY);
            setIsDraftRestored(false);
            setLastSaved(null);
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
        <div className="fade-in h-screen flex flex-col bg-[#F3EBD8] overflow-hidden relative">

            {/* NO global pattern here. We moved it to the sidebar for the 'Split' look */}

            {/* Draft Notification */}
            {showDraftNotification && isDraftRestored && (
                <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-right">
                    <CheckCircle size={20} />
                    <div>
                        <p className="font-bold">Draft Restored</p>
                        <p className="text-xs opacity-90">Continue where you left off</p>
                    </div>
                    <button onClick={() => setShowDraftNotification(false)} className="ml-2 hover:bg-white/20 p-1 rounded"><X size={16} /></button>
                </div>
            )}

            {/* --- Top Bar --- */}
            <div className="bg-[#F3EBD8] px-8 py-6 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-black text-[#510813] tracking-tight">KIKIKS ORDER</h2>
                    <p className="text-[#510813]/60 font-medium">Let's stock up on happiness!</p>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Reseller Select */}
                    <div className="relative group">
                        <select
                            value={selectedResellerId}
                            onChange={handleResellerChange}
                            disabled={!!orderId}
                            className="appearance-none bg-[#510813] text-white pl-6 pr-12 py-3 rounded-full font-bold shadow-lg hover:bg-[#6a0a19] transition-colors cursor-pointer outline-none focus:ring-4 ring-[#E5562E]/30"
                        >
                            <option value="">Select Reseller...</option>
                            {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-white/50 pointer-events-none" size={20} />
                    </div>
                    <button onClick={handleSettingsClick} className="p-3 rounded-full bg-white text-[#510813] shadow-md hover:scale-110 transition-transform"><Settings size={24} /></button>
                </div>
            </div>

            {/* --- Content Area (Split Screen) --- */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Categories (The Interaction Zone) */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {/* Address Field */}
                    <div className="mb-8">
                        <input
                            type="text"
                            placeholder="Delivery Address (Barangay, Province)"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-[#510813]/20 py-2 text-xl font-bold text-[#510813] placeholder-[#510813]/30 focus:border-[#E5562E] focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {CATEGORIES.filter(cat => inventory.some(i => i.sku.startsWith(cat.id) && i.isVisible !== false)).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`relative h-64 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#510813]/20 group flex flex-col justify-between overflow-hidden ${cat.color} ${cat.shadow}`}
                            >
                                {/* Decorative Big Icon in BG */}
                                <cat.icon className="absolute -bottom-8 -right-8 opacity-20 rotate-[-15deg] transition-transform group-hover:rotate-0 group-hover:scale-110" size={160} />

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30">
                                        <cat.icon size={32} className="text-white drop-shadow-sm" />
                                    </div>
                                    <div className="bg-white text-[#510813] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {Object.keys(cart).filter(sku => sku.startsWith(cat.id)).length} Items
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h4 className="text-3xl font-black tracking-wide drop-shadow-md">{cat.label}</h4>
                                    <div className="h-1 w-12 bg-white/50 rounded-full mt-2 group-hover:w-full transition-all duration-500"></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: The 'Fun Zone' Sidebar - Floating "Cookie" Card Style */}
                <div className="w-[450px] relative z-20 flex flex-col h-full py-4 pr-4 pl-0">
                    <div className="relative flex-1 flex flex-col drop-shadow-2xl" id="sidebar-container">

                        {/* The 'Wavy Box' Background Construction */}
                        <div className="absolute inset-0 z-0">
                            {/* 1. The Dots (The Scalloped Edge) */}
                            <div className="absolute inset-0"
                                style={{
                                    backgroundImage: "radial-gradient(circle, #E5562E 20px, transparent 20.5px)",
                                    backgroundSize: "40px 40px",
                                    backgroundRepeat: "round"
                                }}
                            />
                            {/* 2. The Filler (Solid Center) */}
                            <div className="absolute inset-[20px] bg-[#E5562E]" />
                        </div>

                        {/* Content Container (Padded to sit inside the waves) */}
                        <div className="relative z-10 flex-1 flex flex-col overflow-hidden rounded-[40px] m-[10px]">
                            {/* Pattern Background (Inside the safe zone) */}
                            <TropicalPattern opacity={0.25} />

                            <div className="absolute inset-0 z-20 flex flex-col p-6 text-white">
                                <div className="flex-shrink-0 flex items-center gap-3 mb-6">
                                    <div className="bg-white text-[#E5562E] p-3 rounded-2xl shadow-lg rotate-3">
                                        <ShoppingCart size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">YOUR CART</h3>
                                        <p className="text-white/80 text-sm font-medium">{Object.values(cart).reduce((a, b) => a + b, 0)} Items added</p>
                                    </div>
                                </div>

                                {/* Cart Items List */}
                                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 -mr-2 custom-scrollbar-white">
                                    {Object.keys(cart).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-white/50 border-2 border-dashed border-white/20 rounded-3xl p-8">
                                            <Box size={64} className="mb-4 opacity-50" />
                                            <p className="text-center font-bold">Your cart is empty!</p>
                                            <p className="text-center text-sm mt-2">Tap a colorful card on the left to start.</p>
                                        </div>
                                    ) : (
                                        CATEGORIES.map(cat => {
                                            const catItems = Object.entries(cart).filter(([sku]) => sku.startsWith(cat.id));
                                            if (catItems.length === 0) return null;
                                            const totalQty = catItems.reduce((sum, [, q]) => sum + q, 0);
                                            const totalPrice = catItems.reduce((sum, [sku, qty]) => sum + (qty * getPrice(sku)), 0);

                                            return (
                                                <div key={cat.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-colors">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <cat.icon size={18} />
                                                            <span className="font-bold">{cat.label}</span>
                                                        </div>
                                                        <span className="font-bold bg-white text-[#E5562E] px-2 py-0.5 rounded text-sm">₱{totalPrice.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-sm opacity-80 pl-6 border-l-2 border-white/30 ml-2 space-y-1">
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

                                {/* Total & Submit */}
                                <div className="flex-shrink-0 mt-4 pt-4 border-t border-white/20 bg-[#E5562E]/50 backdrop-blur-md rounded-xl p-4 -mx-2 mb-[-10px]">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="opacity-80 font-medium">Grand Total</span>
                                        <span className="text-4xl font-black">₱{cartTotal.toLocaleString()}</span>
                                    </div>

                                    {currentZone && !isMinOrderMet && (
                                        <div className="bg-white/20 backdrop-blur p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            Add ₱{(minOrderAmount - cartTotal).toLocaleString()} to order
                                        </div>
                                    )}

                                    <button
                                        onClick={handleInitialSubmit}
                                        disabled={!isMinOrderMet || Object.keys(cart).length === 0}
                                        className="w-full bg-white text-[#E5562E] py-4 rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                    >
                                        <FileText size={24} />
                                        SUBMIT ORDER
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                                <tr key={item.sku} className={`hover:bg-[#F3EBD8]/50 transition-colors ${isSelected ? 'bg-[#F3EBD8]' : 'bg-white'}`}>
                                                    <td className="p-3 md:p-4 align-middle">
                                                        <div className="font-bold text-[#510813] text-lg leading-tight">{item.description}</div>
                                                        <div className="text-xs text-gray-400 font-mono mt-1">{item.sku}</div>
                                                    </td>
                                                    <td className="p-3 md:p-4 text-right align-middle text-sm font-bold text-gray-600">
                                                        ₱{price.toLocaleString()}
                                                    </td>
                                                    <td className="p-3 md:p-4 align-middle">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={tempQuantities[item.sku] === undefined ? '' : tempQuantities[item.sku]}
                                                                onChange={(e) => handleModalQuantityChange(item.sku, e.target.value)}
                                                                className={`w-24 p-2 text-center rounded-lg border-2 focus:ring-4 focus:ring-[#E5562E]/20 outline-none transition-all font-black text-xl ${isSelected ? 'border-[#E5562E] text-[#E5562E] bg-white' : 'border-gray-200 focus:border-[#E5562E] text-gray-700 bg-gray-50'}`}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-3 md:p-4 text-right align-middle font-black text-[#E5562E] text-lg">
                                                        {total > 0 && `₱${total.toLocaleString()}`}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {modalItems.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="p-12 text-center text-gray-400 font-medium">
                                                    No items match your search.
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
                                    onClick={() => setIsFinalConfirmOpen(true)}
                                    className="flex-[2] py-3 rounded-xl bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#d4451d] transition-all flex items-center justify-center gap-2"
                                >
                                    PROCEED <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FINAL CONFIRMATION MODAL --- */}
            {isFinalConfirmOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto w-12 h-12 bg-[#F3EBD8] rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="text-[#510813]" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#510813] mb-2">Confirm Order</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to submit your order?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsFinalConfirmOpen(false)}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                No, Cancel
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-lg bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#d4451d] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Yes, Submit'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUCCESS MODAL --- */}
            {isSuccessOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#510813] mb-2">Order Confirmed!</h3>
                        <p className="text-gray-600 mb-8">
                            Transaction completed successfully. A copy of the receipt has been sent to the reseller.
                        </p>
                        <button
                            onClick={handleSuccessDismiss}
                            className="w-full py-3 rounded-xl bg-[#E5562E] text-white font-bold shadow-lg hover:bg-[#d4451d] transition-all"
                        >
                            View Receipt
                        </button>
                    </div>
                </div>
            )}

            {isSettingsOpen && (
                <ResellerSettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
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
