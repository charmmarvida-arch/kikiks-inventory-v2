
import React, { useState } from 'react';
import { X, Edit2, Plus, Heart } from 'lucide-react';

const ValentinesMenuSettings = ({ isOpen, onClose, menuConfig, onSaveMenu }) => {
    const [editingItem, setEditingItem] = useState(null);
    const [tempItem, setTempItem] = useState({ sku: '', description: '', category: 'FGC', priceLeg: 0, priceSor: 0 });

    if (!isOpen) return null;

    const handleEdit = (item, index) => {
        setEditingItem(index);
        setTempItem({ ...item });
    };

    const handleAddNew = (catID) => {
        setEditingItem('new');
        setTempItem({ sku: `${catID}-`, description: '', category: catID, priceLeg: 0, priceSor: 0 });
    };

    const handleSave = () => {
        if (!tempItem.sku || !tempItem.description) {
            alert("SKU and Description are required");
            return;
        }

        const newMenu = [...menuConfig];
        // If sku exists, update it, or add new
        if (editingItem === 'new') {
            newMenu.push(tempItem);
        } else {
            newMenu[editingItem] = tempItem;
        }

        onSaveMenu(newMenu);
        setEditingItem(null);
    };

    const handleDelete = (index) => {
        if (confirm("Delete item?")) {
            const newMenu = menuConfig.filter((_, i) => i !== index);
            onSaveMenu(newMenu);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-[#510813] text-white p-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Heart fill="white" /> Menu Configuration</h2>
                    <button onClick={onClose}><X /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-pink-50">
                    {editingItem !== null ? (
                        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                            <h3 className="font-bold text-lg">{editingItem === 'new' ? 'New Item' : 'Edit Item'}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <input value={tempItem.description} onChange={e => setTempItem({ ...tempItem, description: e.target.value })} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">SKU</label>
                                    <input value={tempItem.sku} onChange={e => setTempItem({ ...tempItem, sku: e.target.value })} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Legazpi ₱</label>
                                        <input type="number" value={tempItem.priceLeg} onChange={e => setTempItem({ ...tempItem, priceLeg: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Sorsogon ₱</label>
                                        <input type="number" value={tempItem.priceSor} onChange={e => setTempItem({ ...tempItem, priceSor: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingItem(null)} className="flex-1 py-2 border rounded-lg">Cancel</button>
                                <button onClick={handleSave} className="flex-1 py-2 bg-[#D42426] text-white rounded-lg">Save</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {[
                                { id: 'Cake', label: 'Cakes', color: 'bg-red-100 border-red-200' },
                                { id: 'FGC', label: 'Cups', color: 'bg-orange-100 border-orange-200' },
                                { id: 'FGP', label: 'Pints', color: 'bg-pink-100 border-pink-200' },
                                { id: 'FGL', label: 'Liters', color: 'bg-yellow-100 border-yellow-200' },
                                { id: 'OTHER', label: 'Other', color: 'bg-gray-100 border-gray-200' }
                            ].map(cat => (
                                <div key={cat.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                    <div className={`p-3 font-bold flex justify-between items-center ${cat.color}`}>
                                        <span>{cat.label}</span>
                                        <button onClick={() => handleAddNew(cat.id)} className="p-1 px-3 bg-white/50 rounded-lg text-xs hover:bg-white"><Plus size={14} /></button>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {menuConfig.filter(i => {
                                            if (cat.id === 'OTHER') return !['Cake', 'FGC', 'FGP', 'FGL', 'FGG'].includes(i.sku.split('-')[0]);
                                            return i.sku.startsWith(cat.id);
                                        }).map((item, idx) => {
                                            // Find actual index in main array
                                            const realIdx = menuConfig.indexOf(item);
                                            return (
                                                <div key={item.sku} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                                    <div>
                                                        <div className="font-bold text-sm">{item.description}</div>
                                                        <div className="text-xs text-gray-400">{item.sku}</div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right text-xs">
                                                            <div>L: ₱{item.priceLeg}</div>
                                                            <div>S: ₱{item.priceSor}</div>
                                                        </div>
                                                        <button onClick={() => handleEdit(item, realIdx)} className="p-2 bg-gray-100 rounded-lg text-blue-600"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDelete(realIdx)} className="p-2 bg-gray-100 rounded-lg text-red-600"><X size={14} /></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
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

export default ValentinesMenuSettings;
