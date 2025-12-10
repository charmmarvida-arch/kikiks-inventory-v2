import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Save, Plus, Trash2, Edit2, Check, AlertCircle, ShoppingBag, MapPin, DollarSign, Calendar } from 'lucide-react';

const ResellerSettingsModal = ({ onClose }) => {
    const {
        resellers, addReseller, updateReseller, deleteReseller,
        resellerZones, addResellerZone, updateResellerZone, deleteResellerZone,
        zonePrices, updateZonePrice,
        resellerSettings, updateResellerSetting
    } = useInventory();

    const [activeTab, setActiveTab] = useState('resellers'); // resellers, categories, pricing, targets

    // Tabs Configuration
    const TABS = [
        { id: 'resellers', label: 'Resellers', icon: ShoppingBag },
        { id: 'categories', label: 'Categories', icon: MapPin },
        { id: 'pricing', label: 'Price List', icon: DollarSign },
        { id: 'targets', label: 'Monthly Targets', icon: Calendar },
    ];

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 60 }}>
            <div className="modal-content large-modal flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw' }}>
                {/* Header */}
                <div className="modal-header border-b border-gray-100 p-4 shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="modal-title flex items-center gap-2 text-xl font-bold text-[#510813]">
                            Reseller Management
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
                    {activeTab === 'resellers' && <ResellersTab resellers={resellers} zones={resellerZones} addReseller={addReseller} updateReseller={updateReseller} deleteReseller={deleteReseller} />}
                    {activeTab === 'categories' && <CategoriesTab zones={resellerZones} addZone={addResellerZone} updateZone={updateResellerZone} deleteZone={deleteResellerZone} />}
                    {activeTab === 'pricing' && <PricingTab zones={resellerZones} zonePrices={zonePrices} updateZonePrice={updateZonePrice} />}
                    {activeTab === 'targets' && <TargetsTab resellers={resellers} settings={resellerSettings} updateSetting={updateResellerSetting} />}
                </div>
            </div>
        </div>
    );
};

// --- TAB 1: Resellers Management ---
const ResellersTab = ({ resellers, zones, addReseller, updateReseller, deleteReseller }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', zone_id: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (editingId) {
            await updateReseller(editingId, formData);
        } else {
            // Generate a temporary ID if backend doesn't handle it immediately, but Context usually handles it
            await addReseller({ ...formData, id: crypto.randomUUID() });
        }
        resetForm();
    };

    const handleEdit = (reseller) => {
        setFormData({ name: reseller.name, zone_id: reseller.zone_id || '' });
        setEditingId(reseller.id);
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure? This will delete the reseller.')) {
            await deleteReseller(id);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', zone_id: '' });
        setEditingId(null);
        setIsAdding(false);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-lg text-gray-800">Reseller List</h4>
                    <p className="text-sm text-gray-500">Manage reseller accounts and category assignments</p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2 bg-[#510813] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#3d060e] transition-colors">
                        <Plus size={16} /> Add Reseller
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Reseller Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter name..."
                                autoFocus
                            />
                        </div>
                        <div className="w-1/3">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none"
                                value={formData.zone_id}
                                onChange={e => setFormData({ ...formData, zone_id: e.target.value })}
                            >
                                <option value="">No Category</option>
                                {zones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
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
                            <th className="p-4 rounded-tl-xl">Reseller Name</th>
                            <th className="p-4">Category</th>
                            <th className="p-4 text-center rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {resellers.map(r => {
                            const zone = zones.find(z => z.id === r.zone_id);
                            return (
                                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">{r.name}</td>
                                    <td className="p-4">
                                        {zone ? (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                                {zone.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {resellers.length === 0 && (
                            <tr><td colSpan="3" className="p-8 text-center text-gray-500">No resellers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- TAB 2: Categories (Zones) Management ---
const CategoriesTab = ({ zones, addZone, updateZone, deleteZone }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', minimum_order_value: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        const data = {
            name: formData.name,
            minimum_order_value: Number(formData.minimum_order_value) || 0
        };

        if (editingId) {
            await updateZone(editingId, data);
        } else {
            await addZone(data);
        }
        resetForm();
    };

    const handleEdit = (zone) => {
        setFormData({ name: zone.name, minimum_order_value: zone.minimum_order_value });
        setEditingId(zone.id);
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this category? Associated resellers will be unassigned.')) {
            await deleteZone(id);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', minimum_order_value: '' });
        setEditingId(null);
        setIsAdding(false);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-lg text-gray-800">Product Categories</h4>
                    <p className="text-sm text-gray-500">Define categories and minimum order requirements</p>
                </div>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2 bg-[#510813] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#3d060e] transition-colors">
                        <Plus size={16} /> Add Category
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Category Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Provincial"
                                autoFocus
                            />
                        </div>
                        <div className="w-1/3">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Min. Order (₱)</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none"
                                value={formData.minimum_order_value}
                                onChange={e => setFormData({ ...formData, minimum_order_value: e.target.value })}
                                placeholder="0"
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
                            <th className="p-4 rounded-tl-xl">Category Name</th>
                            <th className="p-4 text-right">Minimum Order</th>
                            <th className="p-4 text-center rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {zones.map(z => (
                            <tr key={z.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900">{z.name}</td>
                                <td className="p-4 text-right font-medium text-gray-600">₱{z.minimum_order_value?.toLocaleString()}</td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleEdit(z)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(z.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {zones.length === 0 && (
                            <tr><td colSpan="3" className="p-8 text-center text-gray-500">No categories found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- TAB 3: Pricing Configuration ---
const PricingTab = ({ zones, zonePrices, updateZonePrice }) => {
    const SKU_TYPES = [
        { id: 'FGC', label: 'Cups' },
        { id: 'FGP', label: 'Pints' },
        { id: 'FGL', label: 'Liters' },
        { id: 'FGG', label: 'Gallons' },
        { id: 'FGT', label: 'Trays' },
    ];

    const [loading, setLoading] = useState({});

    const handlePriceChange = async (zoneId, prefix, value) => {
        const key = `${zoneId}-${prefix}`;
        setLoading(prev => ({ ...prev, [key]: true }));
        try {
            await updateZonePrice(zoneId, prefix, value);
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h4 className="font-bold text-lg text-gray-800">Price List Configuration</h4>
                <p className="text-sm text-gray-500">Set unit prices for each category and product type</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[#510813] text-white text-xs font-semibold uppercase">
                        <tr>
                            <th className="p-4 rounded-tl-xl min-w-[150px]">Category</th>
                            {SKU_TYPES.map((type, idx) => (
                                <th key={type.id} className={`p-4 text-center min-w-[100px] ${idx === SKU_TYPES.length - 1 ? 'rounded-tr-xl' : ''}`}>
                                    {type.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {zones.map(zone => (
                            <tr key={zone.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 font-bold text-gray-800 border-r border-gray-100 sticky left-0 bg-white">
                                    {zone.name}
                                </td>
                                {SKU_TYPES.map(type => {
                                    const price = zonePrices[zone.id]?.[type.id] || 0;
                                    const key = `${zone.id}-${type.id}`;
                                    const isLoading = loading[key];

                                    return (
                                        <td key={type.id} className="p-3">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₱</span>
                                                <input
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => handlePriceChange(zone.id, type.id, e.target.value)}
                                                    className={`w-full pl-6 pr-2 py-1.5 text-right border rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#E5562E] outline-none transition-all
                                                        ${isLoading ? 'bg-gray-100 text-gray-400' : 'bg-white border-gray-200'}
                                                    `}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {zones.length === 0 && (
                            <tr><td colSpan={SKU_TYPES.length + 1} className="p-8 text-center text-gray-500">No categories defined.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-xs text-center text-gray-400">
                Changes are saved automatically when you edit a field.
            </p>
        </div>
    );
};

// --- TAB 4: Monthly Targets (Existing Logic) ---
const TargetsTab = ({ resellers, settings, updateSetting }) => {
    // Derived state for unique resellers from list
    const resellerList = useMemo(() => {
        return [...resellers].sort((a, b) => a.name.localeCompare(b.name));
    }, [resellers]);

    const [saving, setSaving] = useState({});

    // Get helper
    const getSetting = (resellerName) => settings.find(s => s.reseller_name === resellerName) || {};

    const handleSave = async (resellerName, date, min) => {
        setSaving(prev => ({ ...prev, [resellerName]: true }));
        try {
            await updateSetting(resellerName, min, date);
            alert('Settings saved!'); // Simple feedback
        } finally {
            setSaving(prev => ({ ...prev, [resellerName]: false }));
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h4 className="font-bold text-lg text-gray-800">Monthly Compliance Targets</h4>
                <p className="text-sm text-gray-500">Set the specific monthly order requirement and cycle start date for each reseller.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="p-4 rounded-tl-xl w-1/3">Reseller Name</th>
                            <th className="p-4 w-1/4">Start Day</th>
                            <th className="p-4 w-1/4">Minimum (₱)</th>
                            <th className="p-4 text-center rounded-tr-xl">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {resellerList.map((r) => {
                            const setting = getSetting(r.name);
                            // We use uncontrolled inputs with refs or just local vars for a simplified row component would be better
                            // BUT given the structure, let's just make a row component to handle local state
                            return (
                                <TargetsRow
                                    key={r.id}
                                    reseller={r}
                                    initialDate={setting.start_date || ''}
                                    initialMin={setting.minimum_monthly_order || 10000}
                                    onSave={handleSave}
                                    isSaving={saving[r.name]}
                                />
                            );
                        })}
                        {resellerList.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">No resellers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TargetsRow = ({ reseller, initialDate, initialMin, onSave, isSaving }) => {
    const [date, setDate] = useState(initialDate);
    const [min, setMin] = useState(initialMin);

    return (
        <tr className="hover:bg-gray-50/50 transition-colors">
            <td className="p-4 font-medium text-gray-900">{reseller.name}</td>
            <td className="p-4">
                <input
                    type="date"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
            </td>
            <td className="p-4">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₱</span>
                    <input
                        type="number"
                        className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E5562E] outline-none text-sm"
                        value={min}
                        onChange={(e) => setMin(e.target.value)}
                    />
                </div>
            </td>
            <td className="p-4 text-center">
                <button
                    onClick={() => onSave(reseller.name, date, min)}
                    disabled={isSaving}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs flex items-center justify-center gap-1 mx-auto"
                >
                    {isSaving ? (
                        'Saving...'
                    ) : (
                        <>
                            <Save size={14} /> Save
                        </>
                    )}
                </button>
            </td>
        </tr>
    );
};

export default ResellerSettingsModal;

