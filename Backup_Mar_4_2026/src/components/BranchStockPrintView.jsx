import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useBranchInventory } from '../context/BranchInventoryContext';
import { Printer, ArrowLeft } from 'lucide-react';

const BranchStockPrintView = () => {
    const { location } = useParams();
    const { legazpiInventory } = useInventory();
    const { getBranchInventory, loading } = useBranchInventory();
    const [inventoryItems, setInventoryItems] = useState([]);
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        const date = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
        setCurrentDate(date);
    }, []);

    useEffect(() => {
        let data = [];
        if (location === 'Legazpi Storage') {
            data = legazpiInventory; // Already loaded in context
        } else {
            data = getBranchInventory(location);
        }

        // Enhance data for display
        const processData = data.map(item => {
            // Clean up description (Remove | Cup, | Pint, etc.)
            let cleanDesc = item.product_name || item.product_description || item.description || '';
            cleanDesc = cleanDesc.replace(/\|\s*(cup|pint|1l|liter|1gal|gallon|tub|tray)s?/gi, '').trim();

            return {
                sku: item.sku,
                description: cleanDesc,
                flavor: item.flavor || '',
                stock: parseInt(item.current_stock || item.quantity || 0),
                unit: item.unit || 'PCS'
            };
        });

        setInventoryItems(processData);

    }, [location, legazpiInventory, getBranchInventory]);

    // Grouping Logic
    const getSizeCategory = (sku) => {
        if (!sku) return 'Others';
        const prefix = sku.split('-')[0];
        const sizeMap = {
            'FGC': 'Cups',
            'FGP': 'Pints',
            'FGL': 'Liters',
            'FGG': 'Gallons',
            'FGT': 'Trays'
        };
        return sizeMap[prefix] || 'Others';
    };

    const groupedItems = {
        'Cups': [],
        'Pints': [],
        'Liters': [],
        'Gallons': [],
        'Trays': [],
        'Others': []
    };

    inventoryItems.forEach(item => {
        const category = getSizeCategory(item.sku);
        if (groupedItems[category]) {
            groupedItems[category].push(item);
        } else {
            groupedItems['Others'].push(item);
        }
    });

    // Sort items within groups
    Object.keys(groupedItems).forEach(key => {
        groupedItems[key].sort((a, b) => a.sku.localeCompare(b.sku));
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white min-h-screen text-black font-sans">
            {/* Non-printable Controls */}
            <div className="print:hidden bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                <button
                    onClick={() => window.close()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-200"
                >
                    <ArrowLeft size={18} /> Close
                </button>
                <div className="font-bold text-gray-700">Preview Mode</div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-sm"
                >
                    <Printer size={18} /> Print List
                </button>
            </div>

            {/* Printable Content */}
            <div className="p-8 max-w-[210mm] mx-auto print:p-0 print:max-w-none">

                {/* Header */}
                <div className="mb-6 border-b-2 border-black pb-4">
                    <div className="flex justify-between items-end">
                        <div className="flex-1">
                            <h1 className="text-2xl font-black uppercase tracking-wider mb-1">Stock Audit Sheet</h1>
                            <h2 className="text-xl font-medium text-gray-800">{location}</h2>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                            Generated on: <span className="font-bold text-black">{currentDate}</span>
                        </div>
                    </div>
                </div>

                {/* Grid for content - Strict 2-column layout for alignment */}
                <div className="grid grid-cols-2 gap-8 items-start">

                    {/* Left Column: Cups, Pints, Trays */}
                    <div className="space-y-6">
                        {['Cups', 'Pints', 'Trays'].map(category => {
                            const items = groupedItems[category];
                            if (items.length === 0) return null;

                            return (
                                <div key={category} className="break-inside-avoid w-full">
                                    {/* Category Header */}
                                    <div className="bg-black text-white px-3 py-1.5 font-bold uppercase tracking-wider text-sm mb-0 rounded-t-sm print:bg-black print:text-white border border-black">
                                        {category}
                                    </div>
                                    <table className="w-full text-xs border-collapse border-b border-l border-r border-black/20">
                                        <thead>
                                            <tr className="bg-gray-100 print:bg-gray-100 border-b border-black/20">
                                                {/* SKU Hidden in Print */}
                                                <th className="px-2 py-1.5 text-left w-16 print:hidden font-semibold border-r border-black/10">SKU</th>
                                                <th className="px-3 py-1.5 text-left font-semibold border-r border-black/10">Item Description</th>
                                                <th className="px-2 py-1.5 text-center w-12 font-semibold border-r border-black/10">Unit</th>
                                                <th className="px-2 py-1.5 text-center w-14 font-semibold border-r border-black/10 bg-gray-50 print:bg-gray-50">System</th>
                                                <th className="px-2 py-1.5 text-center w-16 font-semibold border-r border-black/10">Actual</th>
                                                <th className="px-2 py-1.5 text-center w-20 font-semibold">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index} className="border-b border-black/10 last:border-0 hover:bg-gray-50">
                                                    <td className="px-2 py-1.5 font-mono text-[10px] text-gray-500 print:hidden border-r border-black/10">{item.sku}</td>
                                                    <td className="px-3 py-1.5 font-medium text-gray-900 border-r border-black/10 align-middle">
                                                        {item.description}
                                                        {item.flavor && <span className="text-gray-500 font-normal ml-1">({item.flavor})</span>}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center text-gray-500 border-r border-black/10 align-middle text-[10px]">{item.unit}</td>
                                                    <td className="px-2 py-1.5 text-center font-bold bg-gray-50 print:bg-gray-50 border-r border-black/10 align-middle">
                                                        {item.stock}
                                                    </td>
                                                    <td className="border-r border-black/10"></td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column: Liters, Gallons, Others */}
                    <div className="space-y-6">
                        {['Liters', 'Gallons', 'Others'].map(category => {
                            const items = groupedItems[category];
                            if (items.length === 0) return null;

                            return (
                                <div key={category} className="break-inside-avoid w-full">
                                    {/* Category Header */}
                                    <div className="bg-black text-white px-3 py-1.5 font-bold uppercase tracking-wider text-sm mb-0 rounded-t-sm print:bg-black print:text-white border border-black">
                                        {category}
                                    </div>
                                    <table className="w-full text-xs border-collapse border-b border-l border-r border-black/20">
                                        <thead>
                                            <tr className="bg-gray-100 print:bg-gray-100 border-b border-black/20">
                                                {/* SKU Hidden in Print */}
                                                <th className="px-2 py-1.5 text-left w-16 print:hidden font-semibold border-r border-black/10">SKU</th>
                                                <th className="px-3 py-1.5 text-left font-semibold border-r border-black/10">Item Description</th>
                                                <th className="px-2 py-1.5 text-center w-12 font-semibold border-r border-black/10">Unit</th>
                                                <th className="px-2 py-1.5 text-center w-14 font-semibold border-r border-black/10 bg-gray-50 print:bg-gray-50">System</th>
                                                <th className="px-2 py-1.5 text-center w-16 font-semibold border-r border-black/10">Actual</th>
                                                <th className="px-2 py-1.5 text-center w-20 font-semibold">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index} className="border-b border-black/10 last:border-0 hover:bg-gray-50">
                                                    <td className="px-2 py-1.5 font-mono text-[10px] text-gray-500 print:hidden border-r border-black/10">{item.sku}</td>
                                                    <td className="px-3 py-1.5 font-medium text-gray-900 border-r border-black/10 align-middle">
                                                        {item.description}
                                                        {item.flavor && <span className="text-gray-500 font-normal ml-1">({item.flavor})</span>}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center text-gray-500 border-r border-black/10 align-middle text-[10px]">{item.unit}</td>
                                                    <td className="px-2 py-1.5 text-center font-bold bg-gray-50 print:bg-gray-50 border-r border-black/10 align-middle">
                                                        {item.stock}
                                                    </td>
                                                    <td className="border-r border-black/10"></td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Signatures */}
                <div className="mt-12 pt-8 border-t border-gray-400 break-inside-avoid">
                    <div className="grid grid-cols-3 gap-8 text-sm">
                        <div>
                            <div className="font-bold mb-8">Audited By:</div>
                            <div className="border-b border-black w-3/4"></div>
                            <div className="mt-1 text-xs text-gray-500">Name & Signature</div>
                        </div>
                        <div>
                            <div className="font-bold mb-8">Verified By:</div>
                            <div className="border-b border-black w-3/4"></div>
                            <div className="mt-1 text-xs text-gray-500">Manager / Supervisor</div>
                        </div>
                        <div>
                            <div className="font-bold mb-8">Date of Audit:</div>
                            <div className="border-b border-black w-3/4"></div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400 print:text-gray-400">
                    Generated via Kikiks Inventory System
                </div>
            </div>

            <style>
                {`
                    @media print {
                        @page { size: A4; margin: 10mm; }
                        body { background: white; -webkit-print-color-adjust: exact; }
                        .no-print { display: none !important; }
                    }
                `}
            </style>
        </div>
    );
};

export default BranchStockPrintView;
