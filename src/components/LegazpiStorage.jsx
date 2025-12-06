import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Settings, Edit2, Save, X, Search, Download, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const LegazpiStorage = () => {
    const { legazpiInventory, addLegazpiProduct, updateLegazpiProduct, deleteLegazpiProduct } = useInventory();
    const { user } = useAuth();

    // Core state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, stock

    // Modals
    const [editingProduct, setEditingProduct] = useState(null);
    const [addingProduct, setAddingProduct] = useState(false);

    // New product form
    const [newProduct, setNewProduct] = useState({
        sku: '',
        product_name: '',
        quantity: 0,
        unit: 'PCS'
    });

    const handleAddProduct = async () => {
        if (!newProduct.sku || !newProduct.product_name) {
            alert('Please enter SKU and Product Description');
            return;
        }

        await addLegazpiProduct(newProduct);
        setAddingProduct(false);
        setNewProduct({
            sku: '',
            product_name: '',
            quantity: 0,
            unit: 'PCS'
        });
    };

    const startEdit = (product) => {
        setEditingProduct({ ...product });
    };

    const cancelEdit = () => {
        setEditingProduct(null);
    };

    const saveEdit = async () => {
        if (!editingProduct) return;

        const { id, product_name, flavor, quantity, unit } = editingProduct;

        await updateLegazpiProduct(id, {
            product_name,
            flavor,
            quantity: Number(quantity),
            unit
        });

        cancelEdit();
    };

    const handleDelete = async (id, productName) => {
        if (confirm(`Are you sure you want to delete "${productName}"?`)) {
            await deleteLegazpiProduct(id);
        }
    };

    // Filter and sort inventory
    const filteredAndSortedInventory = legazpiInventory
        .filter(item => {
            const matchesSearch =
                item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.flavor?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'stock') {
                return b.quantity - a.quantity;
            } else {
                // Sort by size priority: Cup → Pint → Liter → Gallon → Tub
                const priority = { 'FGC': 1, 'FGP': 2, 'FGL': 3, 'FGG': 4, 'FGT': 5 };
                const getPrefix = (sku) => sku?.split('-')[0] || '';
                const pA = priority[getPrefix(a.sku)] || 99;
                const pB = priority[getPrefix(b.sku)] || 99;

                // If same priority (same size), sort by SKU
                if (pA !== pB) return pA - pB;
                return (a.sku || '').localeCompare(b.sku || '');
            }
        });

    // Calculate totals
    const totals = {
        totalItems: filteredAndSortedInventory.length,
        totalStock: filteredAndSortedInventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
        lowStockCount: filteredAndSortedInventory.filter(i => i.quantity < 10).length,
        outOfStockCount: filteredAndSortedInventory.filter(i => i.quantity === 0).length
    };

    const getStockStatusColor = (quantity) => {
        if (quantity === 0) return '#ef4444'; // red
        if (quantity < 10) return '#f59e0b'; // orange
        return '#10b981'; // green
    };

    return (
        <div className="fade-in">
            {/* Modern Top Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <div>
                    <h2 className="page-title" style={{ marginBottom: '0.25rem' }}>Legazpi Storage</h2>
                    <p className="page-subtitle">Warehouse Inventory</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAddingProduct(true)}
                        className="submit-btn"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div className="form-card p-4">
                    <div className="text-secondary text-sm mb-1">Total Products</div>
                    <div className="text-2xl font-bold text-primary">{totals.totalItems}</div>
                </div>
                <div className="form-card p-4">
                    <div className="text-secondary text-sm mb-1">Total Stock</div>
                    <div className="text-2xl font-bold">{totals.totalStock.toLocaleString()}</div>
                </div>
                {totals.lowStockCount > 0 && (
                    <div className="form-card p-4" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div className="text-secondary text-sm mb-1">Low Stock Alerts</div>
                        <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{totals.lowStockCount}</div>
                    </div>
                )}
                {totals.outOfStockCount > 0 && (
                    <div className="form-card p-4" style={{ borderLeft: '4px solid #ef4444' }}>
                        <div className="text-secondary text-sm mb-1">Out of Stock</div>
                        <div className="text-2xl font-bold text-danger">{totals.outOfStockCount}</div>
                    </div>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="form-card p-4 mb-4">
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }} />
                        <input
                            type="text"
                            placeholder="Search Product or Flavor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="premium-input"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="premium-input"
                        style={{ width: 'auto', minWidth: '150px' }}
                    >
                        <option value="name">Sort by Name</option>
                        <option value="stock">Sort by Stock</option>
                    </select>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="form-card p-0 overflow-hidden">
                <div className="table-container">
                    <table className="inventory-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                            <tr>
                                <th>Status</th>
                                <th>SKU</th>
                                <th>Product Description</th>
                                <th>UOM</th>
                                <th>Current Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedInventory.map((item, index) => {
                                const isEditing = editingProduct?.id === item.id;
                                const description = item.flavor
                                    ? `${item.product_name} ${item.flavor}`
                                    : item.product_name;

                                // Check if SKU prefix changed (for spacing)
                                const currentPrefix = item.sku?.split('-')[0];
                                const previousItem = index > 0 ? filteredAndSortedInventory[index - 1] : null;
                                const previousPrefix = previousItem?.sku?.split('-')[0];
                                const showSpacer = index > 0 && currentPrefix !== previousPrefix;

                                return (
                                    <React.Fragment key={item.id}>
                                        {showSpacer && (
                                            <tr className="spacer-row">
                                                <td colSpan={6} style={{ height: '8px', background: 'var(--gray-50)' }}></td>
                                            </tr>
                                        )}
                                        <tr style={{
                                            borderLeft: `4px solid ${getStockStatusColor(item.quantity)}`,
                                            transition: 'all 0.2s'
                                        }}>
                                            <td>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: getStockStatusColor(item.quantity),
                                                    margin: '0 auto'
                                                }}></div>
                                            </td>
                                            <td className="font-medium">{item.sku || '-'}</td>
                                            <td>{description}</td>
                                            <td>{item.unit}</td>
                                            <td className="font-bold text-lg" style={{ color: getStockStatusColor(item.quantity) }}>
                                                {item.quantity?.toLocaleString() || 0}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="icon-btn text-primary small-btn"
                                                        title="Edit Product"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.product_name)}
                                                        className="icon-btn text-danger small-btn"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Product Modal */}
            {addingProduct && (
                <div className="modal-overlay" onClick={() => setAddingProduct(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add New Product</h2>
                            <button className="close-btn" onClick={() => setAddingProduct(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">SKU *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., FGC-001"
                                    value={newProduct.sku}
                                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                    className="premium-input"
                                    autoFocus
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Product Description *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Cafe Mocha Cup"
                                    value={newProduct.product_name}
                                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                                    className="premium-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">UOM (Unit of Measure)</label>
                                <select
                                    value={newProduct.unit}
                                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                                    className="premium-input"
                                >
                                    <option value="PCS">PCS</option>
                                    <option value="BOX">BOX</option>
                                    <option value="KG">KG</option>
                                    <option value="LITER">LITER</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Initial Quantity</label>
                                <input
                                    type="number"
                                    value={newProduct.quantity}
                                    onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                                    className="premium-input"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleAddProduct} className="submit-btn flex-1">
                                    <Save size={18} className="mr-2" />
                                    Add Product
                                </button>
                                <button onClick={() => setAddingProduct(false)} className="icon-btn flex-1 border border-gray-300">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="modal-overlay" onClick={cancelEdit}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Edit Product</h2>
                            <button className="close-btn" onClick={cancelEdit}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Product Name *</label>
                                <input
                                    type="text"
                                    value={editingProduct.product_name}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, product_name: e.target.value })}
                                    className="premium-input"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Quantity</label>
                                <input
                                    type="number"
                                    value={editingProduct.quantity}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value) || 0 })}
                                    className="premium-input"
                                    style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-sm text-secondary mb-1">Unit</label>
                                <select
                                    value={editingProduct.unit}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                                    className="premium-input"
                                >
                                    <option value="PCS">PCS</option>
                                    <option value="BOX">BOX</option>
                                    <option value="KG">KG</option>
                                    <option value="LITER">LITER</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={saveEdit} className="submit-btn flex-1">
                                    <Save size={18} className="mr-2" />
                                    Save Changes
                                </button>
                                <button onClick={cancelEdit} className="icon-btn flex-1 border border-gray-300">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LegazpiStorage;
