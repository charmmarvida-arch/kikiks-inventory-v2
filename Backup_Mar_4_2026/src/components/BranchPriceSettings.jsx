import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Save, DollarSign, ListFilter, SlidersHorizontal } from 'lucide-react';

const BranchPriceSettings = ({ isOpen, onClose, branchLocation }) => {
    const { inventory, locationSRPs, updateLocationSRP, updateLocationCategoryPrices } = useInventory();
    const [prices, setPrices] = useState({});
    const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'batch'
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    // Batch settings
    const [batchCategory, setBatchCategory] = useState('Cups');
    const [batchPrice, setBatchPrice] = useState('');

    useEffect(() => {
        if (isOpen && branchLocation) {
            // Load existing prices for this location
            setPrices(locationSRPs[branchLocation] || {});
        }
    }, [isOpen, branchLocation, locationSRPs]);

    if (!isOpen) return null;

    const handlePriceChange = (sku, value) => {
        setPrices(prev => ({
            ...prev,
            [sku]: value
        }));
    };

    const handleSaveIndividual = async (sku) => {
        const price = prices[sku];
        if (price === undefined || price === '') return;

        setSaving(true);
        try {
            await updateLocationSRP(branchLocation, sku, price);
        } catch (error) {
            console.error(error);
            alert('Failed to save price');
        } finally {
            setSaving(false);
        }
    };

    const handleBatchApply = async () => {
        if (!batchPrice) return;

        if (!window.confirm(`Are you sure you want to set ALL ${batchCategory} to ₱${batchPrice} for ${branchLocation}?`)) {
            return;
        }

        setSaving(true);
        try {
            // Map common prefixes
            const prefixMap = {
                'Cups': 'FGC',
                'Pints': 'FGP',
                'Liters': 'FGL',
                'Gallons': 'FGG',
                'Trays': 'FGT'
            };
            const prefix = prefixMap[batchCategory];

            // Construct updates object
            const updates = { [prefix]: batchPrice };

            await updateLocationCategoryPrices(branchLocation, updates);
            alert('Batch prices updated successfully!');
            setBatchPrice('');
        } catch (error) {
            console.error(error);
            alert('Failed to batch update prices');
        } finally {
            setSaving(false);
        }
    };

    // Filter items
    const filteredItems = inventory.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm fade-in">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-[#510813] text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <DollarSign className="text-[#E5562E]" />
                            Price Settings: {branchLocation}
                        </h2>
                        <p className="text-white/60 text-sm">Set Selling Retail Price (SRP) for this branch</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">

                    {/* Sidebar / Tabs */}
                    <div className="w-full md:w-64 bg-gray-50 p-4 flex flex-col gap-2">
                        <button
                            onClick={() => setActiveTab('individual')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'individual' ? 'bg-white shadow-md text-[#510813] font-bold border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <ListFilter size={18} />
                            <span>Individual Prices</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('batch')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'batch' ? 'bg-white shadow-md text-[#510813] font-bold border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <SlidersHorizontal size={18} />
                            <span>Batch Update</span>
                        </button>

                        <div className="mt-auto bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 text-sm mb-1">Did you know?</h4>
                            <p className="text-xs text-blue-600">Setting prices here will automatically calculate the total stock value on your dashboard.</p>
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-white">

                        {activeTab === 'individual' ? (
                            <>
                                {/* Search */}
                                <div className="p-4 border-b border-gray-100">
                                    <input
                                        type="text"
                                        placeholder="Search product..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5562E]/20 focus:border-[#E5562E]"
                                    />
                                </div>

                                {/* Table */}
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-40 text-right">Price (PHP)</th>
                                                <th className="px-6 py-3 w-20"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredItems.map(item => (
                                                <tr key={item.sku} className="hover:bg-gray-50 group">
                                                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{item.sku}</td>
                                                    <td className="px-6 py-3 font-medium text-gray-800">{item.description}</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={prices[item.sku] || ''}
                                                            onChange={(e) => handlePriceChange(item.sku, e.target.value)}
                                                            className="w-24 text-right px-2 py-1 border border-gray-300 rounded focus:border-[#E5562E] focus:outline-none focus:ring-1 focus:ring-[#E5562E]"
                                                            placeholder="0.00"
                                                        />
                                                    </td>
                                                    <td className="px-2">
                                                        {prices[item.sku] !== (locationSRPs[branchLocation]?.[item.sku]) && (
                                                            <button
                                                                onClick={() => handleSaveIndividual(item.sku)}
                                                                disabled={saving}
                                                                className="text-[#E5562E] hover:bg-[#E5562E]/10 p-1.5 rounded-full transition-colors"
                                                                title="Save Price"
                                                            >
                                                                <Save size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 max-w-lg mx-auto w-full">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Batch Update Prices</h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Cups', 'Pints', 'Liters', 'Gallons', 'Trays'].map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setBatchCategory(cat)}
                                                    className={`px-4 py-3 rounded-xl border font-medium text-sm transition-all ${batchCategory === cat
                                                        ? 'bg-[#E5562E] border-[#E5562E] text-white shadow-lg'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Set Price For All {batchCategory}</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                                            <input
                                                type="number"
                                                value={batchPrice}
                                                onChange={e => setBatchPrice(e.target.value)}
                                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E5562E]/20 focus:border-[#E5562E] text-lg font-bold text-gray-900"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            This will update the SRP for all items in the <strong>{batchCategory}</strong> category for <strong>{branchLocation}</strong>.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleBatchApply}
                                        disabled={!batchPrice || saving}
                                        className="w-full bg-[#510813] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3d0610] shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Updating...' : `Apply ₱${batchPrice} to All ${batchCategory}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchPriceSettings;
