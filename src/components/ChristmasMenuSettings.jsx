import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Plus } from 'lucide-react';

const ChristmasMenuSettings = ({ isOpen, onClose, menuConfig, onSaveMenu }) => {
    const [editingItem, setEditingItem] = useState(null); // null = list view, index = editing
    const [tempItem, setTempItem] = useState({ sku: '', description: '', category: 'FGC', priceLeg: 0, priceSor: 0 });

    if (!isOpen) return null;

    const handleEdit = (item, index) => {
        setEditingItem(index);
        setTempItem({ ...item });
    };

    const handleAddNew = () => {
        setEditingItem('new');
        setTempItem({ sku: '', description: '', category: 'FGC', priceLeg: 0, priceSor: 0 });
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

    const handleDelete = (index) => {
        if (confirm("Delete this item?")) {
            const newMenu = menuConfig.filter((_, i) => i !== index);
            onSaveMenu(newMenu);
        }
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
                        <p className="text-white/60 text-sm">Configure items and location-based prices</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={24} />
                    </button>
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
                        <>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={handleAddNew}
                                    className="px-4 py-2 bg-[#0f172a] text-white rounded-lg font-bold text-sm shadow hover:bg-[#1e293b] flex items-center gap-2"
                                >
                                    <Plus size={16} /> Add Item
                                </button>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Description</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Legazpi</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Sorsogon</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {menuConfig.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-800">{item.description}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-600">₱{item.priceLeg}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-600">₱{item.priceSor}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleEdit(item, idx)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChristmasMenuSettings;
