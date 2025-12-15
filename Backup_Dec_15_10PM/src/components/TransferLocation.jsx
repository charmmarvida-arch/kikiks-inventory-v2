import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Settings, X, Save, Package, Coffee, Droplet, Box as BoxIcon } from 'lucide-react';
import Toast from './Toast';

const MAIN_CATEGORIES = [
    { id: 'FGC', name: 'Cups', icon: Coffee, color: '#ff6b6b' },
    { id: 'FGP', name: 'Pints', icon: Droplet, color: '#4ecdc4' },
    { id: 'FGL', name: 'Liters', icon: Droplet, color: '#45b7d1' },
    { id: 'FGG', name: 'Gallons', icon: BoxIcon, color: '#96ceb4' },
    { id: 'FGT', name: 'Trays', icon: Package, color: '#ffeaa7' }
];

const OTHERS_CATEGORY = { id: 'OTHERS', name: 'Others', icon: Package, color: '#a8a8a8' };

// Warehouse locations (no pricing required)
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
        deleteSku
    } = useInventory();

    // State declarations
    const [fromLocation, setFromLocation] = useState('FTF Manufacturing');
    const [toLocation, setToLocation] = useState('');
    const [editingOrder, setEditingOrder] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [quantities, setQuantities] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingPriceLocation, setEditingPriceLocation] = useState(null);
    const [tempPrices, setTempPrices] = useState({});
    const [newItem, setNewItem] = useState({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });

    // Inventory Management State
    const [activeTab, setActiveTab] = useState('add'); // 'add' | 'manage'
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    const handleAddItem = async () => {
        if (!editingPriceLocation) return;

        try {
            if (editingItem) {
                // UPDATE EXISTING ITEM
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
                // ADD NEW ITEM
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
                        quantity: 0 // Default to 0 for inventory to avoid mess
                    });
                    // If user specified quantity, we might want to add stock? 
                    // For now let's stick to adding the SKU definition.
                    // The input has quantity, so maybe we should honor it?
                    // existing addSku sets quantity to 0. 
                    // Let's force update if quantity is provided.
                    if (newItem.quantity > 0) {
                        await addStock(newItem.sku, newItem.quantity);
                    }
                    alert('Item added to Inventory');
                }
            }
            // Reset form
            setNewItem({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });
            setActiveTab('manage'); // Switch to view the item
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
        setActiveTab('add'); // Switch to form
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

    // Filter items for management view
    const filteredManagementItems = useMemo(() => {
        if (!editingPriceLocation) return [];

        let items = [];
        if (editingPriceLocation === 'Legazpi Storage') {
            items = legazpiInventory;
        } else if (editingPriceLocation === 'FTF Manufacturing') {
            items = inventory;
        }

        if (!searchTerm) return items;

        const lowerSearch = searchTerm.toLowerCase();
        return items.filter(item => {
            if (editingPriceLocation === 'Legazpi Storage') {
                return item.product_name?.toLowerCase().includes(lowerSearch) ||
                    item.flavor?.toLowerCase().includes(lowerSearch);
            } else {
                return item.sku?.toLowerCase().includes(lowerSearch) ||
                    item.description?.toLowerCase().includes(lowerSearch);
            }
        });
    }, [editingPriceLocation, legazpiInventory, inventory, searchTerm]);

    // Get source inventory based on FROM location
    const sourceInventory = useMemo(() => {
        if (fromLocation === 'FTF Manufacturing') {
            return inventory;
        } else if (fromLocation === 'Legazpi Storage') {
            return legazpiInventory.map(item => ({
                sku: item.sku || `${item.product_name}-${item.flavor || 'Default'}`, // Use valid SKU if available
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

        // Warehouses have no pricing
        if (WAREHOUSE_LOCATIONS.includes(toLocation)) return 0;

        // Get price from location SRPs
        return locationSRPs[toLocation]?.[sku] || 0;
    };

    // Check if TO location is a branch (has pricing)
    const isBranch = toLocation && !WAREHOUSE_LOCATIONS.includes(toLocation);

    // Send Discord notification
    const sendDiscordNotification = async (orderData) => {
        const webhookUrl = import.meta.env.VITE_DISCORD_TRANSFER_WEBHOOK;

        if (!webhookUrl) {
            console.warn('⚠️ Discord webhook URL not configured. Skipping notification.');
            console.warn('💡 Set VITE_DISCORD_TRANSFER_WEBHOOK in your .env file to enable notifications.');
            return;
        }

        console.log('📤 Sending Discord notification for transfer order...');
        console.log('FROM:', orderData.from_location, '→ TO:', orderData.destination);

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
                    {
                        name: '📅 Date',
                        value: new Date().toLocaleString('en-US', {
                            timeZone: 'Asia/Manila',
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        }),
                        inline: false
                    },
                    { name: '📋 Items Transferred', value: itemsList || 'None', inline: false },
                    { name: '📊 Total Quantity', value: Object.values(orderData.items).reduce((sum, qty) => sum + qty, 0).toString(), inline: true }
                ],
                footer: { text: 'Kikiks Inventory System' },
                timestamp: new Date().toISOString()
            };

            if (isBranch && orderData.total_amount > 0) {
                embed.fields.push({
                    name: '💰 Total Value',
                    value: `₱${orderData.total_amount.toFixed(2)}`,
                    inline: true
                });
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Discord notification failed:', response.status, response.statusText);
                console.error('Error details:', errorText);
            } else {
                console.log('✅ Discord notification sent successfully!');
            }
        } catch (error) {
            console.error('❌ Discord notification error:', error);
            console.error('Error details:', error.message);
        }
    };

    // Group products by category
    const productsByCategory = useMemo(() => {
        const grouped = {};
        const matchedSkus = new Set();

        // Group products by main categories
        MAIN_CATEGORIES.forEach(cat => {
            const items = sourceInventory.filter(item =>
                item.sku?.startsWith(cat.id) || item.description?.toLowerCase().includes(cat.name.slice(0, -1).toLowerCase())
            );
            grouped[cat.id] = items;

            // Track matched items
            items.forEach(item => matchedSkus.add(item.sku));
        });

        // Find products that don't match any main category (OTHERS)
        // Only include items that haven't been matched to a main category yet
        grouped['OTHERS'] = sourceInventory.filter(item => !matchedSkus.has(item.sku));

        return grouped;
    }, [sourceInventory]);

    // Get visible categories (main + others if it has products)
    const visibleCategories = useMemo(() => {
        const categories = [...MAIN_CATEGORIES];
        if (productsByCategory['OTHERS']?.length > 0) {
            categories.push(OTHERS_CATEGORY);
        }
        return categories;
    }, [productsByCategory]);

    // Calculate category totals
    const categoryTotals = useMemo(() => {
        const totals = {};
        visibleCategories.forEach(cat => {
            const products = productsByCategory[cat.id] || [];
            const qty = products.reduce((sum, product) => {
                return sum + (quantities[product.sku] || 0);
            }, 0);
            const value = products.reduce((sum, product) => {
                const q = quantities[product.sku] || 0;
                const price = getPrice(product.sku);
                return sum + (q * price);
            }, 0);
            totals[cat.id] = { qty, value };
        });
        return totals;
    }, [quantities, productsByCategory, toLocation, locationSRPs, visibleCategories]);

    // Calculate grand totals
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

    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId);
    };

    const closeModal = () => {
        setSelectedCategory(null);
    };

    const handleSettingsClick = () => {
        setIsSettingsOpen(true);
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

    const handleSubmitTransfer = async () => {
        // Prevent duplicate submissions
        if (isSubmitting) return;

        if (!fromLocation) {
            alert('Please select a FROM location');
            return;
        }
        if (!toLocation) {
            alert('Please select a TO location');
            return;
        }
        if (fromLocation === toLocation) {
            alert('FROM and TO locations cannot be the same');
            return;
        }

        const transferItems = {};
        let hasItems = false;

        Object.entries(quantities).forEach(([sku, qty]) => {
            if (qty > 0) {
                transferItems[sku] = qty;
                hasItems = true;
            }
        });

        if (!hasItems) {
            alert('Please add at least one item to transfer');
            return;
        }

        try {
            setIsSubmitting(true);

            // Create transfer order
            const newOrder = {
                from_location: fromLocation,
                destination: toLocation,
                items: transferItems,
                total_amount: grandTotals.totalValue,
                status: 'Unread',
                type: 'Transfer'
            };

            await addTransferOrder(newOrder);

            // Send Discord notification
            sendDiscordNotification(newOrder).catch(console.error);

            // NOTE: Stock adjustment is now handled when status changes to "Completed"
            // in the Legazpi Storage History / Location Dashboard
            // This prevents double-counting and allows for proper workflow management

            // Show success toast
            setShowToast(true);

            // Reset
            setQuantities({});
            setToLocation('');
        } catch (error) {
            console.error('Transfer error:', error);
            alert('Failed to submit transfer: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get available TO locations (exclude FROM location)
    const toLocationOptions = useMemo(() => {
        const allLocations = [...WAREHOUSE_LOCATIONS, ...kikiksLocations];
        return allLocations.filter(loc => loc !== fromLocation);
    }, [fromLocation, kikiksLocations]);

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 className="page-title" style={{ marginBottom: '0.25rem' }}>Transfer Location</h2>
                    <p className="page-subtitle">Transfer stock between locations</p>
                </div>
                {!isPublic && (
                    <button onClick={handleSettingsClick} className="icon-btn text-primary" title="Location Settings">
                        <Settings size={20} />
                    </button>
                )}
            </div>

            {/* Transfer Info Card */}
            <div className="form-card mb-4">
                <div className="form-grid" style={{
                    gridTemplateColumns: '1fr 1fr 200px',
                    gap: '1rem',
                    '@media (max-width: 768px)': { gridTemplateColumns: '1fr' }
                }}>
                    <div className="form-group">
                        <label>Transfer FROM</label>
                        <select
                            value={fromLocation}
                            onChange={(e) => {
                                setFromLocation(e.target.value);
                                setQuantities({}); // Clear quantities when changing FROM
                            }}
                            className="premium-input"
                        >
                            {WAREHOUSE_LOCATIONS.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Transfer TO</label>
                        <select
                            value={toLocation}
                            onChange={(e) => setToLocation(e.target.value)}
                            className="premium-input"
                        >
                            <option value="">Select Location</option>
                            {toLocationOptions.map(loc => (
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

            {/* Main Content Area */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Left: Product Categories */}
                <div style={{ flex: 1 }}>
                    <h3 className="text-lg font-semibold mb-4">Product Categories</h3>
                    <div
                        style={{
                            display: 'grid',
                            gap: '1.5rem'
                        }}
                        className="product-categories-grid"
                    >
                        {visibleCategories.map(category => {
                            const Icon = category.icon;
                            const totals = categoryTotals[category.id] || { qty: 0, value: 0 };

                            return (
                                <div
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category.id)}
                                    className="form-card"
                                    style={{
                                        padding: '1.5rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        borderLeft: `4px solid ${category.color}`,
                                        ':hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <Icon size={24} style={{ color: category.color, marginRight: '0.5rem' }} />
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>{category.name}</h4>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: category.color }}>
                                        {totals.qty} Quantity
                                    </div>
                                    {isBranch && (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            ₱{totals.value.toLocaleString()}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        Click to add items
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Transfer Summary */}
                <div style={{ minWidth: '300px', flex: '0 0 auto' }}>
                    <div className="form-card" style={{ position: 'sticky', top: '1rem' }}>
                        <h3 className="text-lg font-semibold mb-4">Transfer Summary</h3>

                        {toLocation && (
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Transfer TO:</div>
                                <div style={{ fontWeight: '600' }}>{toLocation}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Items</span>
                                <span className="font-medium">{grandTotals.totalItems}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Quantity</span>
                                <span className="font-medium">{grandTotals.totalQty}</span>
                            </div>
                            {isBranch && (
                                <>
                                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                        <span style={{ fontWeight: '600' }}>Total Value</span>
                                        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
                                            ₱{grandTotals.totalValue.toLocaleString()}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleSubmitTransfer}
                            className="submit-btn"
                            style={{ width: '100%', justifyContent: 'center' }}
                            disabled={!toLocation || grandTotals.totalQty === 0 || isSubmitting}
                        >
                            <Save size={18} style={{ marginRight: '0.5rem' }} />
                            Submit Transfer
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            {selectedCategory && (
                <div className="modal-overlay" onClick={closeModal} style={{ padding: '1rem' }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '650px', margin: '2rem auto', borderRadius: '12px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                Select {visibleCategories.find(c => c.id === selectedCategory)?.name} to Transfer
                            </h2>
                            <button className="close-btn" onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {productsByCategory[selectedCategory]?.map(product => {
                                    const price = getPrice(product.sku);
                                    const qty = quantities[product.sku] || 0;

                                    return (
                                        <div
                                            key={product.sku}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: window.innerWidth <= 768 ? '2fr 80px 120px' : (isBranch ? '2fr 100px 100px 120px' : '2fr 100px 120px'),
                                                gap: '1rem',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                background: qty > 0 ? 'var(--primary-subtle)' : 'var(--gray-50)',
                                                borderRadius: 'var(--radius-md)',
                                                border: qty > 0 ? '2px solid var(--primary)' : '1px solid var(--border-color)'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{product.description}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    Stock: {product.quantity} {product.uom}
                                                </div>
                                            </div>

                                            {isBranch && window.innerWidth > 768 && (
                                                <div style={{ textAlign: 'right', fontWeight: '600' }}>
                                                    ₱{price}
                                                </div>
                                            )}

                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                                Avail: {product.quantity}
                                            </div>

                                            <input
                                                type="number"
                                                min="0"
                                                max={product.quantity}
                                                value={quantities[product.sku] || ''}
                                                onChange={(e) => handleQuantityChange(product.sku, e.target.value)}
                                                placeholder="0"
                                                className="premium-input"
                                                style={{ textAlign: 'center', width: '100%' }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button onClick={closeModal} className="icon-btn" style={{ padding: '0.5rem 1.5rem' }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                    <div className="modal-content large-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', height: '600px', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Location Pricing Settings</h2>
                            <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex' }}>
                            {/* LEFT: Locations List */}
                            <div style={{ width: '300px', borderRight: '1px solid var(--border-color)', backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
                                <div style={{ padding: '1rem' }}>
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        WAREHOUSES
                                    </h3>
                                    {WAREHOUSE_LOCATIONS.map(loc => (
                                        <div
                                            key={loc}
                                            onClick={() => {
                                                setEditingPriceLocation(loc);
                                                setNewItem({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' });
                                            }}
                                            style={{
                                                padding: '0.75rem',
                                                marginBottom: '0.5rem',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                background: editingPriceLocation === loc ? 'white' : 'transparent',
                                                borderLeft: editingPriceLocation === loc ? '4px solid var(--primary)' : '4px solid transparent',
                                                fontWeight: editingPriceLocation === loc ? '600' : '400',
                                                color: editingPriceLocation === loc ? 'var(--primary)' : 'var(--text-primary)'
                                            }}
                                        >
                                            {loc}
                                        </div>
                                    ))}

                                    <h3 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem', marginTop: '1.5rem' }}>
                                        BRANCH LOCATIONS
                                    </h3>
                                    {kikiksLocations.map(loc => (
                                        <div
                                            key={loc}
                                            onClick={() => {
                                                setEditingPriceLocation(loc);
                                                const currentPrices = {};
                                                MAIN_CATEGORIES.forEach(cat => {
                                                    const product = inventory.find(i => i.sku.startsWith(cat.id));
                                                    currentPrices[cat.id] = product ? (locationSRPs[loc]?.[product.sku] || 0) : 0;
                                                });
                                                setTempPrices(currentPrices);
                                            }}
                                            style={{
                                                padding: '0.75rem',
                                                marginBottom: '0.5rem',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                background: editingPriceLocation === loc ? 'white' : 'transparent',
                                                borderLeft: editingPriceLocation === loc ? '4px solid var(--primary)' : '4px solid transparent',
                                                fontWeight: editingPriceLocation === loc ? '600' : '400',
                                                color: editingPriceLocation === loc ? 'var(--primary)' : 'var(--text-primary)'
                                            }}
                                        >
                                            {loc}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* RIGHT: Price Configuration or Add Item */}
                            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                                {editingPriceLocation ? (
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                                            {editingPriceLocation}
                                        </h3>

                                        {WAREHOUSE_LOCATIONS.includes(editingPriceLocation) ? (
                                            <div className="form-card" style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                {/* Tabs */}
                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                                    <button
                                                        onClick={() => { setActiveTab('add'); setEditingItem(null); setNewItem({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' }); }}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            borderBottom: activeTab === 'add' ? '2px solid var(--primary)' : 'none',
                                                            color: activeTab === 'add' ? 'var(--primary)' : 'var(--text-secondary)',
                                                            fontWeight: activeTab === 'add' ? '600' : '400',
                                                            background: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {editingItem ? 'Edit Item' : 'Add New Item'}
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('manage')}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            borderBottom: activeTab === 'manage' ? '2px solid var(--primary)' : 'none',
                                                            color: activeTab === 'manage' ? 'var(--primary)' : 'var(--text-secondary)',
                                                            fontWeight: activeTab === 'manage' ? '600' : '400',
                                                            background: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Manage Inventory
                                                    </button>
                                                </div>

                                                {activeTab === 'add' ? (
                                                    <>
                                                        <h4 className="font-semibold mb-4">{editingItem ? 'Update Item Details' : 'Add New Item to Inventory'}</h4>
                                                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                            {editingPriceLocation === 'Legazpi Storage' ? (
                                                                <>
                                                                    <div className="form-group">
                                                                        <label>Product Name</label>
                                                                        <input
                                                                            className="premium-input"
                                                                            value={newItem.name}
                                                                            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                                            placeholder="e.g. Tray 150g"
                                                                        />
                                                                    </div>
                                                                    <div className="form-group">
                                                                        <label>Flavor</label>
                                                                        <input
                                                                            className="premium-input"
                                                                            value={newItem.flavor}
                                                                            onChange={e => setNewItem({ ...newItem, flavor: e.target.value })}
                                                                            placeholder="Optional"
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="form-group">
                                                                        <label>SKU</label>
                                                                        <input
                                                                            className="premium-input"
                                                                            value={newItem.sku}
                                                                            onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                                                                            placeholder="e.g. FGT-001"
                                                                            disabled={!!editingItem} // Disable SKU editing for safety
                                                                        />
                                                                    </div>
                                                                    <div className="form-group">
                                                                        <label>Description</label>
                                                                        <input
                                                                            className="premium-input"
                                                                            value={newItem.description}
                                                                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                                                            placeholder="e.g. Tray 150g Vanilla"
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="form-group">
                                                                <label>Quantity</label>
                                                                <input
                                                                    type="number"
                                                                    className="premium-input"
                                                                    value={newItem.quantity}
                                                                    onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Unit</label>
                                                                <select
                                                                    className="premium-input"
                                                                    value={newItem.unit}
                                                                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                                                >
                                                                    <option value="PCS">PCS</option>
                                                                    <option value="GRM">GRM</option>
                                                                    <option value="KGS">KGS</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                            <button onClick={handleAddItem} className="submit-btn" style={{ flex: 1 }}>
                                                                <Save size={18} className="mr-2" /> {editingItem ? 'Update Item' : 'Add Item'}
                                                            </button>
                                                            {editingItem && (
                                                                <button
                                                                    onClick={() => { setEditingItem(null); setNewItem({ name: '', flavor: '', quantity: 0, unit: 'PCS', sku: '', description: '' }); setActiveTab('manage'); }}
                                                                    className="secondary-btn"
                                                                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer' }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                        <div style={{ marginBottom: '1rem' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Search items..."
                                                                className="premium-input"
                                                                value={searchTerm}
                                                                onChange={e => setSearchTerm(e.target.value)}
                                                                style={{ width: '100%' }}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                                            {filteredManagementItems.map((item, idx) => (
                                                                <div
                                                                    key={item.id || item.sku || idx}
                                                                    style={{
                                                                        padding: '0.75rem',
                                                                        borderBottom: '1px solid var(--border-color)',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        backgroundColor: 'white'
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                                                            {editingPriceLocation === 'Legazpi Storage' ? `${item.product_name} ${item.flavor || ''}` : item.description}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                            {editingPriceLocation === 'Legazpi Storage' ? `Qty: ${item.quantity} ${item.unit}` : `SKU: ${item.sku} | Qty: ${item.quantity}`}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                        <button
                                                                            onClick={() => handleEditClick(item)}
                                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#e3f2fd', color: '#1976d2', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteClick(editingPriceLocation === 'Legazpi Storage' ? item.id : item.sku)}
                                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {filteredManagementItems.length === 0 && (
                                                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                                    No items found
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                                    Configure pricing for this location
                                                </p>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {MAIN_CATEGORIES.map(cat => (
                                                        <div
                                                            key={cat.id}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '1rem',
                                                                background: 'var(--gray-50)',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--border-color)'
                                                            }}
                                                        >
                                                            <label style={{ fontWeight: '600' }}>
                                                                {cat.name} ({cat.id})
                                                            </label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>₱</span>
                                                                <input
                                                                    type="number"
                                                                    value={tempPrices[cat.id] || 0}
                                                                    onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                                                                    className="premium-input"
                                                                    style={{ width: '120px', textAlign: 'right', fontWeight: '700' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button onClick={savePrices} className="submit-btn">
                                                        <Save size={18} style={{ marginRight: '0.5rem' }} />
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                        <Settings size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Select a location to configure</p>
                                        <p style={{ fontSize: '0.9rem' }}>Choose a branch location from the list</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <Toast
                    message="Transfer Successful!"
                    onClose={() => setShowToast(false)}
                    duration={4000}
                />
            )}
        </div>
    );
};

export default TransferLocation;
