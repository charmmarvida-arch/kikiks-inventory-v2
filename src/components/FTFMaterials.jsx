import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Search, Plus, Trash2, Edit2, AlertTriangle, Layers, Save, X } from 'lucide-react';

const FTFMaterials = () => {
    const { materials, addMaterial, updateMaterial, deleteMaterial, loading } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All'); // All, Raw Materials, Packaging, Stickers
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // { id, item_name, ... }

    // Form State
    const [newItem, setNewItem] = useState({
        item_name: '',
        category: 'Raw Materials',
        uom: 'PCS',
        current_stock: 0,
        min_threshold: 10
    });

    const categories = ['Raw Materials', 'Packaging', 'Stickers'];

    // Filter Logic
    const filteredMaterials = materials.filter(item => {
        const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Handlers
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        await addMaterial(newItem);
        setIsAddModalOpen(false);
        setNewItem({ item_name: '', category: 'Raw Materials', uom: 'PCS', current_stock: 0, min_threshold: 10 });
    };

    const handleEditSave = async () => {
        if (!editingItem) return;
        await updateMaterial(editingItem.id, {
            item_name: editingItem.item_name,
            category: editingItem.category,
            uom: editingItem.uom,
            current_stock: Number(editingItem.current_stock),
            min_threshold: Number(editingItem.min_threshold)
        });
        setEditingItem(null);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading materials...</div>;

    return (
        <div className="fade-in space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Layers className="text-orange-500" />
                        Materials Inventory
                    </h1>
                    <p className="text-gray-500 mt-1">Manage Raw Materials, Packaging, and Stickers</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all transform font-semibold"
                >
                    <Plus size={20} />
                    Add New Item
                </button>
            </div>

            {/* Filters */}
            <div className="form-card p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveCategory('All')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeCategory === 'All' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeCategory === cat ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="form-card p-0 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                <div className="overflow-auto flex-1 custom-scrollbar relative">
                    <table className="inventory-table w-full text-left border-collapse min-w-[1000px]">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Category</th>
                                <th className="p-4 font-semibold text-gray-600">Item Name</th>
                                <th className="p-4 font-semibold text-gray-600 text-center">UOM</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Current Stock</th>
                                <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredMaterials.map((item) => {
                                const isEditing = editingItem?.id === item.id;
                                const isLowStock = item.current_stock <= item.min_threshold;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.category === 'Raw Materials' ? 'bg-blue-100 text-blue-700' :
                                                item.category === 'Packaging' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-gray-800">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editingItem.item_name}
                                                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                                    className="w-full border border-orange-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                            ) : (
                                                item.item_name
                                            )}
                                        </td>
                                        <td className="p-4 text-center text-gray-500">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editingItem.uom}
                                                    onChange={(e) => setEditingItem({ ...editingItem, uom: e.target.value })}
                                                    className="w-20 mx-auto border border-orange-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none text-center"
                                                />
                                            ) : (
                                                item.uom
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-700">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editingItem.current_stock}
                                                    onChange={(e) => setEditingItem({ ...editingItem, current_stock: e.target.value })}
                                                    className="w-24 ml-auto border border-orange-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none text-right"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className={item.current_stock <= 0 ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-gray-800'}>
                                                        {item.current_stock}
                                                    </span>
                                                    {item.min_threshold > 0 && <span className="text-xs text-gray-400">Low &lt; {item.min_threshold}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={handleEditSave} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Save">
                                                            <Save size={18} />
                                                        </button>
                                                        <button onClick={() => setEditingItem(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded" title="Cancel">
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button onClick={() => deleteMaterial(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredMaterials.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No materials found. Click "Add New Item" to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Add New Material</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newItem.item_name}
                                    onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                                <select
                                    value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">UOM</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g., kg, pcs, roll"
                                        value={newItem.uom}
                                        onChange={e => setNewItem({ ...newItem, uom: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Quantity</label>
                                    <input
                                        type="number"
                                        value={newItem.current_stock}
                                        onChange={e => setNewItem({ ...newItem, current_stock: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Low Stock Threshold</label>
                                <input
                                    type="number"
                                    value={newItem.min_threshold}
                                    onChange={e => setNewItem({ ...newItem, min_threshold: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded hover:shadow-lg font-bold"
                                >
                                    Add Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FTFMaterials;
