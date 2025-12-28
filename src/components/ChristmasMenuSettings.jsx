import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Edit2, Plus, CloudUpload, GripVertical } from 'lucide-react';

const ChristmasMenuSettings = ({ isOpen, onClose, menuConfig, onSaveMenu, onSync, onDeleteItem, categoryOrder = [], onSaveCategoryOrder }) => {
    const [editingItem, setEditingItem] = useState(null); // null = list view, index = editing
    const [tempItem, setTempItem] = useState({ sku: '', description: '', category: 'FGC', priceLeg: 0, priceSor: 0 });

    // --- DnD State ---
    const [draggedCatId, setDraggedCatId] = useState(null);

    // Default Categories Config (for Metadata)
    const STANDARD_CAT_META = {
        'FGCK': { label: 'Cakes 🎂', color: 'bg-pink-50 border-pink-200' },
        'CAKE': { label: 'Cakes 🎂', color: 'bg-pink-50 border-pink-200' }, // Alias for typical SKU
        'Cake': { label: 'Cakes 🎂', color: 'bg-pink-50 border-pink-200' }, // Case sensitive alias
        'FGC': { label: 'Cups 🍦', color: 'bg-orange-50 border-orange-200' },
        'FGP': { label: 'Pints 🍨', color: 'bg-red-50 border-red-200' },
        'FGL': { label: 'Liters 🥛', color: 'bg-yellow-50 border-yellow-200' },
        'FGG': { label: 'Gallons 📦', color: 'bg-orange-100 border-orange-300' }
    };

    // --- Derived Categories ---
    const sortedCategories = useMemo(() => {
        // 1. Get all unique prefixes from menuConfig + Standard
        const prefixes = new Set(Object.keys(STANDARD_CAT_META));
        menuConfig.forEach(item => {
            const prefix = item.sku.split('-')[0];
            if (prefix) prefixes.add(prefix);
        });

        const allCats = Array.from(prefixes).map(id => ({
            id,
            label: STANDARD_CAT_META[id]?.label || `${id} Items`,
            color: STANDARD_CAT_META[id]?.color || 'bg-gray-50 border-gray-200'
        }));

        // 2. Sort based on categoryOrder
        return allCats.sort((a, b) => {
            if (!categoryOrder || categoryOrder.length === 0) return 0; // Default order
            const idxA = categoryOrder.indexOf(a.id);
            const idxB = categoryOrder.indexOf(b.id);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0; // Keep original relative order if neither in list
        });
    }, [menuConfig, categoryOrder]);

    const handleEdit = (item, index) => {
        setEditingItem(index);
        setTempItem({ ...item });
    };

    const handleAddNew = (categoryPrefix = 'FGC') => {
        setEditingItem('new');
        setTempItem({ sku: `${categoryPrefix}-`, description: '', category: categoryPrefix, priceLeg: 0, priceSor: 0 });
    };

    const handleSave = () => {
        if (!tempItem.sku || !tempItem.description) {
            alert("SKU and Description are required");
            return;
        }

        const newMenu = [...menuConfig];
        if (editingItem === 'new') {
            newMenu.push(tempItem);
        } else {
            newMenu[editingItem] = tempItem;
        }

        onSaveMenu(newMenu);
        setEditingItem(null);
    };

    const handleDelete = async (index) => {
        const item = menuConfig[index];
        if (confirm(`Permanently delete "${item.description}" (${item.sku})? This cannot be undone.`)) {
            if (onDeleteItem) {
                // Direct Cloud Deletion
                const success = await onDeleteItem(item.sku);
                if (success) {
                    // Local state is updated by parent, but we can optimistically redundant update too
                }
            } else {
                // Fallback (Local Only)
                const newMenu = menuConfig.filter((_, i) => i !== index);
                onSaveMenu(newMenu);
            }
        }
    };

    // --- DnD Handlers ---
    const handleDragStart = (e, catId) => {
        setDraggedCatId(catId);
        e.dataTransfer.effectAllowed = 'move';
        // Add a ghost image or style if needed, but default relies on browser
    };

    const handleDragOver = (e, targetCatId) => {
        e.preventDefault(); // Necessary to allow dropping
        // Optionally add visual feedback here
    };

    const handleDrop = (e, targetCatId) => {
        e.preventDefault();

        if (!draggedCatId || draggedCatId === targetCatId) return;

        const currentOrder = sortedCategories.map(c => c.id);
        const fromIndex = currentOrder.indexOf(draggedCatId);
        const toIndex = currentOrder.indexOf(targetCatId);

        if (fromIndex === -1 || toIndex === -1) return;

        // Reorder
        const newOrder = [...currentOrder];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedCatId);

        // Optimistic update locally? 
        // Actually, we should call parent saver
        if (onSaveCategoryOrder) {
            onSaveCategoryOrder(newOrder);
        }

        setDraggedCatId(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#0f172a] text-white p-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>⚙️</span> Menu & Pricing
                        </h2>
                        <p className="text-white/60 text-sm">Drag to reorder categories • Configure items</p>
                    </div>
                    <div className="flex gap-2">
                        {onSync && (
                            <button
                                onClick={() => onSync(menuConfig)}
                                className="px-4 py-2 bg-[#E5562E] text-white rounded-lg text-sm font-bold shadow hover:bg-[#c03e1b] flex items-center gap-2"
                                title="Sync to Mobile"
                            >
                                <CloudUpload size={18} /> Sync
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                    {editingItem !== null ? (
                        // Edit/Add Form
                        <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-right-4">
                            <h3 className="font-bold text-lg mb-4">{editingItem === 'new' ? 'Add New Item' : 'Edit Item'}</h3>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU</label>
                                <input
                                    type="text"
                                    value={tempItem.sku}
                                    onChange={e => setTempItem({ ...tempItem, sku: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97706] outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <input
                                    type="text"
                                    value={tempItem.description}
                                    onChange={e => setTempItem({ ...tempItem, description: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97706] outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Legazpi Price</label>
                                    <input
                                        type="number"
                                        value={tempItem.priceLeg}
                                        onChange={e => setTempItem({ ...tempItem, priceLeg: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97706] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sorsogon Price</label>
                                    <input
                                        type="number"
                                        value={tempItem.priceSor}
                                        onChange={e => setTempItem({ ...tempItem, priceSor: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97706] outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setEditingItem(null)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2 bg-[#D97706] text-white rounded-lg font-bold hover:bg-[#b45309]"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        // List View
                        <div className="space-y-8">

                            {/* Create New Category Btn */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        const prefix = prompt("Enter 3-Letter Prefix for New Category (e.g. 'NEW'):");
                                        if (prefix && prefix.length >= 2) {
                                            handleAddNew(prefix.toUpperCase());
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 flex items-center gap-1"
                                >
                                    <Plus size={14} /> New Category
                                </button>
                            </div>

                            {sortedCategories.map((cat, index) => (
                                <div
                                    key={cat.id}
                                    className={`rounded-xl border ${cat.color} overflow-hidden transition-opacity ${draggedCatId === cat.id ? 'opacity-40 border-dashed border-2' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, cat.id)}
                                    onDragOver={(e) => handleDragOver(e, cat.id)}
                                    onDrop={(e) => handleDrop(e, cat.id)}
                                >
                                    <div className="p-3 flex justify-between items-center bg-white/50 border-b border-inherit select-none cursor-move active:cursor-grabbing">
                                        <div className="flex items-center gap-3">
                                            <GripVertical size={20} className="text-[#510813]/30" />
                                            <h3 className="font-black text-[#510813] text-lg uppercase tracking-wider">{cat.label}</h3>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAddNew(cat.id); }} // Stop propagation to prevent drag start
                                            className="px-3 py-1.5 bg-[#510813] text-white rounded-lg text-xs font-bold shadow hover:bg-[#510813]/80 flex items-center gap-1 cursor-pointer"
                                            onMouseDown={(e) => e.stopPropagation()} // Vital for draggable parent
                                        >
                                            <Plus size={14} /> Add Item
                                        </button>
                                    </div>
                                    <div className="divide-y divide-gray-200/50">
                                        {menuConfig
                                            .filter(item => item.sku === cat.id || item.sku.startsWith(cat.id + '-'))
                                            .map((item, idx) => {
                                                const originalIndex = menuConfig.indexOf(item);
                                                return (
                                                    <div key={item.sku} className="p-4 flex justify-between items-center bg-white/40 hover:bg-white transition-colors">
                                                        <div>
                                                            <div className="font-bold text-[#510813]">{item.description}</div>
                                                            <div className="text-xs text-[#510813]/50 font-mono">{item.sku}</div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-xs text-[#510813]/60 uppercase font-bold">Legazpi</div>
                                                                <div className="font-bold text-[#510813]">₱{item.priceLeg}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-[#510813]/60 uppercase font-bold">Sorsogon</div>
                                                                <div className="font-bold text-[#510813]">₱{item.priceSor}</div>
                                                            </div>
                                                            <div className="flex gap-1 pl-2 border-l border-[#510813]/10 ml-2">
                                                                <button
                                                                    onClick={() => handleEdit(item, originalIndex)}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(originalIndex)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        {menuConfig.filter(item => item.sku.startsWith(cat.id)).length === 0 && (
                                            <div className="p-8 text-center text-[#510813]/30 text-sm font-medium italic">
                                                No items yet. Click "Add Item" to start.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChristmasMenuSettings;
