import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
    Calculator, Plus, Trash2, ArrowRightLeft, Package,
    AlertCircle, Store
} from 'lucide-react';

// Warehouse locations
const WAREHOUSE_LOCATIONS = ['FTF Manufacturing', 'Legazpi Storage'];

const DistributionCalculator = () => {
    const { inventory, legazpiInventory, kikiksLocations } = useInventory();

    const [selectedSource, setSelectedSource] = useState('FTF Manufacturing');
    const [destinations, setDestinations] = useState([
        { id: Date.now(), name: '', allocations: {} }
    ]);

    // Derived source inventory
    const sourceInventory = useMemo(() => {
        let items = [];
        if (selectedSource === 'FTF Manufacturing') {
            items = inventory || [];
        } else if (selectedSource === 'Legazpi Storage') {
            items = (legazpiInventory || []).map(item => ({
                sku: item.sku || `${item.product_name}-${item.flavor || 'Default'}`,
                description: `${item.product_name} ${item.flavor || ''}`.trim(),
                quantity: item.quantity,
                uom: item.unit,
                id: item.id
            }));
        }

        // Custom sorting priority based on SKU prefix
        const getPriority = (sku) => {
            if (!sku) return 99;
            if (sku.startsWith('FGC')) return 1;
            if (sku.startsWith('FGP')) return 2;
            if (sku.startsWith('FGL')) return 3;
            if (sku.startsWith('FGG')) return 4;
            return 5; // Everything else
        };

        // Sort items by priority, then alphabetically by SKU
        return items.sort((a, b) => {
            const priorityA = getPriority(a.sku);
            const priorityB = getPriority(b.sku);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // If same priority, sort alphabetically
            if (!a.sku) return 1;
            if (!b.sku) return -1;
            return a.sku.localeCompare(b.sku);
        });
    }, [selectedSource, inventory, legazpiInventory]);

    // Destination options excluding the current source
    const destinationOptions = useMemo(() => {
        const allLocations = [...WAREHOUSE_LOCATIONS, ...(kikiksLocations || [])];
        const uniqueOptions = [...new Set(allLocations)];
        return uniqueOptions.filter(loc => loc !== selectedSource);
    }, [selectedSource, kikiksLocations]);

    const handleSourceChange = (e) => {
        const newSource = e.target.value;
        setSelectedSource(newSource);
        // Clear allocations when source changes because items might be different
        setDestinations(prev => prev.map(dest => ({ ...dest, allocations: {} })));
    };

    const addDestination = () => {
        setDestinations(prev => [...prev, { id: Date.now(), name: '', allocations: {} }]);
    };

    const removeDestination = (idToRemove) => {
        setDestinations(prev => prev.filter(dest => dest.id !== idToRemove));
    };

    const handleDestinationNameChange = (id, newName) => {
        setDestinations(prev => prev.map(dest =>
            dest.id === id ? { ...dest, name: newName } : dest
        ));
    };

    const handleAllocationChange = (destId, sku, value) => {
        const numValue = value === '' ? 0 : parseInt(value);
        if (isNaN(numValue) || numValue < 0) return;

        setDestinations(prev => prev.map(dest => {
            if (dest.id === destId) {
                return {
                    ...dest,
                    allocations: {
                        ...dest.allocations,
                        [sku]: numValue
                    }
                };
            }
            return dest;
        }));
    };

    // Helper to calculate total allocated for a specific sku across all columns
    const getTotalAllocated = (sku) => {
        return destinations.reduce((total, dest) => {
            return total + (dest.allocations[sku] || 0);
        }, 0);
    };

    return (
        <div className="fade-in bg-[#f8f9fa] min-h-screen p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-[#510813] flex items-center gap-3">
                            <Calculator className="text-[#E5562E]" size={32} strokeWidth={2.5} />
                            Distribution Calculator
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Plan stock distributions across multiple branches without saving transfers.</p>
                    </div>
                </div>

                {/* Main Content Workspace */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">

                    {/* Toolbar */}
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-wrap items-center gap-6 z-10">
                        <div className="flex items-center gap-3">
                            <label className="font-bold text-gray-700 uppercase text-xs flex items-center gap-2">
                                <Package size={16} /> Source Location:
                            </label>
                            <select
                                value={selectedSource}
                                onChange={handleSourceChange}
                                className="border border-gray-300 rounded-lg px-4 py-2 font-semibold text-[#510813] focus:ring-2 focus:ring-[#E5562E] outline-none"
                            >
                                {WAREHOUSE_LOCATIONS.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

                        <button
                            onClick={addDestination}
                            className="flex items-center gap-2 bg-[#E5562E] hover:bg-[#c94925] text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-colors"
                        >
                            <Plus size={18} strokeWidth={3} /> Add Destination Column
                        </button>
                    </div>

                    {/* Scrollable Grid Area */}
                    <div className="flex-1 overflow-auto bg-gray-100/50 p-4 custom-scrollbar">
                        <div className="inline-block min-w-full bg-white rounded-xl shadow-sm border border-gray-200">

                            <table className="w-full text-left border-collapse">

                                {/* Table Headers */}
                                <thead className="bg-gray-50 sticky top-0 z-20 outline outline-1 outline-gray-200">
                                    <tr>
                                        {/* Sticky Left Column for Items */}
                                        <th className="p-4 border-r border-gray-200 bg-white sticky left-0 z-30 min-w-[250px] font-bold text-gray-600 uppercase text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            Product Details
                                        </th>
                                        <th className="p-4 border-r border-gray-200 text-center font-bold text-gray-600 uppercase text-xs min-w-[120px] bg-gray-50">
                                            Current Stock
                                        </th>
                                        <th className="p-4 border-r border-gray-200 text-center font-bold text-gray-600 uppercase text-xs min-w-[120px] bg-gray-50 shadow-[inset_-2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                                            Remaining
                                        </th>

                                        {/* Dynamic Destination Headers */}
                                        {destinations.map((dest, index) => (
                                            <th key={dest.id} className="p-4 border-r border-gray-200 min-w-[220px] align-top bg-white">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-[#510813] text-sm flex items-center gap-1">
                                                            <Store size={14} className="text-[#E5562E]" /> Dest {index + 1}
                                                        </span>
                                                        {destinations.length > 1 && (
                                                            <button
                                                                onClick={() => removeDestination(dest.id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                                                                title="Remove Column"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <select
                                                        value={dest.name}
                                                        onChange={(e) => handleDestinationNameChange(dest.id, e.target.value)}
                                                        className="w-full border border-gray-300 rounded-md p-2 text-sm font-semibold focus:ring-2 focus:ring-[#E5562E] outline-none bg-gray-50"
                                                    >
                                                        <option value="">Select branch...</option>
                                                        {destinationOptions.map(loc => (
                                                            <option key={loc} value={loc} disabled={destinations.some(d => d.id !== dest.id && d.name === loc)}>{loc}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                {/* Table Body */}
                                <tbody className="divide-y divide-gray-100">
                                    {sourceInventory.map(item => {
                                        const actualStock = item.quantity || 0;
                                        const totalAllocated = getTotalAllocated(item.sku);
                                        const remainingStock = actualStock - totalAllocated;
                                        const isOverAllocated = remainingStock < 0;

                                        return (
                                            <tr key={item.sku} className={`hover:bg-amber-50/30 transition-colors ${isOverAllocated ? 'bg-red-50/50' : ''}`}>

                                                {/* Left Fixed Column: Item Details */}
                                                <td className="p-3 border-r border-gray-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-amber-50/30">
                                                    <div className="font-bold text-[#510813]">{item.description}</div>
                                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</div>
                                                </td>

                                                {/* Current Stock */}
                                                <td className="p-3 border-r border-gray-200 text-center align-middle bg-white group-hover:bg-amber-50/30">
                                                    <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                                        {actualStock} {item.uom}
                                                    </span>
                                                </td>

                                                {/* Remaining Stock */}
                                                <td className={`p-3 border-r border-gray-200 text-center align-middle shadow-[inset_-2px_0_4px_-2px_rgba(0,0,0,0.05)] ${isOverAllocated ? 'bg-red-100/50' : 'bg-green-50/30'}`}>
                                                    <div className={`font-black text-lg flex items-center justify-center gap-1 ${isOverAllocated ? 'text-red-600' : 'text-green-600'}`}>
                                                        {remainingStock}
                                                        {isOverAllocated && <AlertCircle size={16} strokeWidth={3} className="animate-pulse" />}
                                                    </div>
                                                </td>

                                                {/* Dynamic Destination Inputs */}
                                                {destinations.map(dest => {
                                                    const currentVal = dest.allocations[item.sku] || '';
                                                    return (
                                                        <td key={`${item.sku}-${dest.id}`} className="p-3 border-r border-gray-100 align-middle bg-white">
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={currentVal}
                                                                    onChange={(e) => handleAllocationChange(dest.id, item.sku, e.target.value)}
                                                                    placeholder="0"
                                                                    disabled={!dest.name}
                                                                    className={`w-24 text-center border-2 rounded-lg p-2 font-bold focus:outline-none transition-colors 
                                                                        ${currentVal > 0 ? 'border-[#E5562E] text-[#510813] bg-orange-50/30' : 'border-gray-200 text-gray-500 focus:border-gray-400'} 
                                                                        disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}

                                    {sourceInventory.length === 0 && (
                                        <tr>
                                            <td colSpan={3 + destinations.length} className="p-8 text-center text-gray-400 font-medium">
                                                No items found in {selectedSource}.
                                            </td>
                                        </tr>
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

export default DistributionCalculator;
