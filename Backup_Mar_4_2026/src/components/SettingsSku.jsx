import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Save, CheckSquare, Square, Edit2, Trash2, X, Search } from 'lucide-react';

const SettingsSku = () => {
    const { inventory, kikiksLocations, addSku, updateSku, deleteSku } = useInventory();

    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [uom, setUom] = useState('PCS');
    const [selectedLocations, setSelectedLocations] = useState([...kikiksLocations]); // Default to all
    const [searchTerm, setSearchTerm] = useState('');

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [originalSku, setOriginalSku] = useState(null);

    const toggleLocation = (loc) => {
        if (selectedLocations.includes(loc)) {
            setSelectedLocations(selectedLocations.filter(l => l !== loc));
        } else {
            setSelectedLocations([...selectedLocations, loc]);
        }
    };

    const toggleAll = () => {
        if (selectedLocations.length === kikiksLocations.length) {
            setSelectedLocations([]);
        } else {
            setSelectedLocations([...kikiksLocations]);
        }
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setOriginalSku(item.sku);
        setSku(item.sku);
        setDescription(item.description);
        setUom(item.uom);
        setSelectedLocations(item.locations || [...kikiksLocations]);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setOriginalSku(null);
        setSku('');
        setDescription('');
        setUom('PCS');
        setSelectedLocations([...kikiksLocations]);
    };

    const handleDelete = (skuToDelete) => {
        if (window.confirm(`Are you sure you want to delete SKU: ${skuToDelete}?`)) {
            deleteSku(skuToDelete);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!sku || !description || !uom) {
            alert('Please fill in all fields');
            return;
        }

        // Check for duplicate SKU
        if (isEditing) {
            if (sku !== originalSku && inventory.some(item => item.sku === sku)) {
                alert('SKU already exists! Please choose a different SKU.');
                return;
            }
        } else {
            if (inventory.some(item => item.sku === sku)) {
                alert('SKU already exists!');
                return;
            }
        }

        const itemData = {
            sku,
            description,
            uom,
            locations: selectedLocations
        };

        if (isEditing) {
            updateSku(originalSku, itemData);
            alert('SKU Updated Successfully!');
            handleCancelEdit();
        } else {
            addSku(itemData);
            alert('SKU Added Successfully!');
            // Reset form
            setSku('');
            setDescription('');
            setUom('PCS');
            setSelectedLocations([...kikiksLocations]);
        }
    };

    // Filter inventory
    const filteredInventory = inventory.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">SKU Management</h2>
                <p className="page-subtitle">Add, edit, and manage products and their visibility</p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>

                {/* LEFT: Form */}
                <div style={{ flex: '0 0 400px', minWidth: '300px' }}>
                    <div className="form-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 className="card-heading" style={{ margin: 0, border: 'none', padding: 0 }}>
                                {isEditing ? 'Edit SKU' : 'Add New SKU'}
                            </h3>
                            {isEditing && (
                                <button onClick={handleCancelEdit} className="icon-btn text-secondary" title="Cancel Edit">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-4">
                                <label>SKU Code</label>
                                <input
                                    type="text"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    className="premium-input"
                                    placeholder="e.g., FGT-006"
                                    required
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label>Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="premium-input"
                                    placeholder="Product Name"
                                    required
                                />
                            </div>
                            <div className="form-group mb-6">
                                <label>Unit of Measure (UOM)</label>
                                <select
                                    value={uom}
                                    onChange={(e) => setUom(e.target.value)}
                                    className="premium-input"
                                >
                                    <option value="PCS">PCS</option>
                                    <option value="PACK">PACK</option>
                                    <option value="BOX">BOX</option>
                                    <option value="KG">KG</option>
                                </select>
                            </div>

                            <div className="form-group mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="mb-0">Location Visibility</label>
                                    <button
                                        type="button"
                                        onClick={toggleAll}
                                        className="text-xs text-primary font-bold hover:underline"
                                    >
                                        {selectedLocations.length === kikiksLocations.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                                    {kikiksLocations.map(loc => {
                                        const isSelected = selectedLocations.includes(loc);
                                        return (
                                            <div
                                                key={loc}
                                                onClick={() => toggleLocation(loc)}
                                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-gray-400" />}
                                                <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-gray-600'}`}>{loc}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button type="submit" className="submit-btn w-full justify-center">
                                <Save size={18} />
                                {isEditing ? 'Update SKU' : 'Save SKU'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT: List */}
                <div style={{ flex: '1 1 500px', minWidth: '300px' }}>
                    <div className="form-card p-0 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 150px)' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                            <h3 className="card-heading" style={{ fontSize: '1rem', marginBottom: 0, border: 'none', padding: 0 }}>Existing SKUs</h3>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search SKUs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        padding: '0.3rem 0.6rem 0.3rem 2rem',
                                        fontSize: '0.8rem',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        outline: 'none',
                                        width: '200px'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="table-container" style={{ flex: 1, overflowY: 'auto', margin: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }}>
                            <table className="inventory-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th>SKU</th>
                                        <th>Description</th>
                                        <th style={{ width: '80px' }}>UOM</th>
                                        <th>Visibility</th>
                                        <th className="text-right" style={{ width: '100px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-state">No SKUs found.</td>
                                        </tr>
                                    ) : (
                                        filteredInventory.map(item => (
                                            <tr key={item.sku} className={isEditing && originalSku === item.sku ? 'bg-indigo-50' : ''}>
                                                <td className="font-medium">{item.sku}</td>
                                                <td>{item.description}</td>
                                                <td>{item.uom}</td>
                                                <td className="text-secondary text-xs">
                                                    {item.locations && item.locations.length > 0
                                                        ? (item.locations.length === kikiksLocations.length ? 'All Locations' : `${item.locations.length} Locations`)
                                                        : 'All Locations'}
                                                </td>
                                                <td>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="icon-btn text-primary small-btn"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.sku)}
                                                            className="icon-btn text-danger small-btn"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsSku;
