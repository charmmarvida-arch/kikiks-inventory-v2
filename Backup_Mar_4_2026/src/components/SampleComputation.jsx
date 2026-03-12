import React, { useState, useEffect } from 'react';
import { Calculator, Receipt, Settings, X, Save, Info } from 'lucide-react';

const SampleComputation = () => {
    // State for invoice items
    const [items, setItems] = useState([
        { id: 1, name: 'Ice Cream, Cup', quantity: '', price: '' },
        { id: 2, name: 'Ice Cream, Pint', quantity: '', price: '' },
        { id: 3, name: 'Ice Cream, Liter', quantity: '', price: '' },
        { id: 4, name: 'Ice Cream, Gallon', quantity: '', price: '' }
    ]);

    // State for Settings Modal
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [defaultPrices, setDefaultPrices] = useState({
        1: '', // Cup
        2: '', // Pint
        3: '', // Liter
        4: ''  // Gallon
    });

    // Load saved prices on mount
    useEffect(() => {
        const savedPrices = localStorage.getItem('kikiks_invoice_defaults');
        if (savedPrices) {
            const parsed = JSON.parse(savedPrices);
            setDefaultPrices(parsed);

            // Apply them to the current items immediately
            setItems(prevItems => prevItems.map(item => ({
                ...item,
                price: parsed[item.id] !== undefined ? parsed[item.id] : item.price
            })));
        }
    }, []);

    // Save default prices to LocalStorage
    const handleSaveSettings = () => {
        localStorage.setItem('kikiks_invoice_defaults', JSON.stringify(defaultPrices));

        // Also apply to current view
        setItems(items.map(item => ({
            ...item,
            price: defaultPrices[item.id] !== undefined ? defaultPrices[item.id] : item.price
        })));

        setIsSettingsOpen(false);
    };

    // Handle updates to specific rows
    const updateItem = (id, field, value) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Computations
    const calculateRowTotal = (item) => {
        const qty = parseFloat(item.quantity) || 0;
        const prc = parseFloat(item.price) || 0;
        return qty * prc;
    };

    const totalSales = items.reduce((sum, item) => sum + calculateRowTotal(item), 0);
    const netOfVat = totalSales / 1.12;
    const vatAmount = totalSales - netOfVat;

    // Formatting helper
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div className="fade-in h-[100dvh] flex flex-col bg-[#F3EBD8] overflow-hidden">
            {/* Header */}
            <div className="bg-[#510813] px-8 py-6 z-10 flex flex-col md:flex-row justify-between items-center shadow-md">
                <div className="flex items-center gap-4 text-white w-full">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm hidden md:block">
                        <Calculator size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-wide">Sales Invoice Itemizer</h2>
                        <p className="text-white/70 font-medium text-xs md:text-sm">Compute Bulk Quantities & BIR VAT Automatically</p>
                    </div>
                </div>
                {/* Settings Button */}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="mt-4 md:mt-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-colors flex items-center gap-2"
                >
                    <Settings size={20} />
                    <span className="font-bold text-sm hidden md:inline">Default Prices</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start justify-center">

                {/* Left Side: Items Input (The Main Invoice Body) */}
                <div className="w-full lg:w-2/3 bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-8 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Receipt size={24} className="text-[#E5562E]" /> Items to Invoice
                        </h3>
                    </div>

                    <div className="p-4 md:p-8">
                        {/* Headers (Hidden on Mobile) */}
                        <div className="hidden md:grid grid-cols-12 gap-4 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                            <div className="col-span-5">Item Description</div>
                            <div className="col-span-2 text-center">Quantity</div>
                            <div className="col-span-2 text-center">Unit Price</div>
                            <div className="col-span-3 text-right pr-4">Total</div>
                        </div>

                        {/* Invoice Rows */}
                        <div className="space-y-4 md:space-y-2">
                            {items.map(item => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50/50 md:bg-transparent p-4 md:p-2 rounded-xl md:rounded-none border md:border-none border-gray-100">
                                    {/* Name Input */}
                                    <div className="col-span-1 md:col-span-5">
                                        <label className="block text-xs font-bold text-gray-400 mb-1 md:hidden">Description</label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#E5562E] focus:ring-2 focus:ring-[#E5562E]/20 font-medium text-gray-700"
                                            placeholder="Item Name"
                                        />
                                    </div>

                                    {/* Quantity Input */}
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 mb-1 md:hidden">Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#E5562E] focus:ring-2 focus:ring-[#E5562E]/20 font-mono text-center"
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Price Input */}
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 mb-1 md:hidden">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₱</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                                                className="w-full pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#E5562E] focus:ring-2 focus:ring-[#E5562E]/20 font-mono text-right"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Row Total */}
                                    <div className="col-span-1 md:col-span-3 text-right">
                                        <label className="block text-xs font-bold text-gray-400 mb-1 md:hidden">Subtotal</label>
                                        <div className="font-mono font-bold text-gray-800 bg-white md:bg-transparent px-4 py-2 rounded-lg border border-gray-200 md:border-none">
                                            {formatCurrency(calculateRowTotal(item))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: The Official Computations */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    {/* Information Alert */}
                    <div className="bg-blue-50 border border-blue-200 rounded-[24px] p-6 flex gap-4 items-start shadow-sm">
                        <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={24} />
                        <div>
                            <h4 className="font-bold text-blue-900 text-lg">BIR Breakdown</h4>
                            <p className="text-sm text-blue-800 mt-2 leading-relaxed opacity-90">
                                This tool treats the Total Sales as VAT Inclusive (12%). It automatically reverses this to find your true Net Sales.
                            </p>
                            <div className="mt-3 bg-white/50 rounded-lg p-3 text-xs font-mono text-blue-900 border border-blue-100">
                                Net of VAT = Total / 1.12<br />
                                VAT Amount = Total - Net of VAT
                            </div>
                        </div>
                    </div>

                    {/* Final Calculations Card */}
                    <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden sticky top-8">
                        <div className="p-6 bg-gray-50 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest text-center">Final Computations</h3>
                        </div>

                        <div className="p-6 md:p-8 space-y-4">

                            <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <span className="font-bold text-gray-600">Total Sales</span>
                                <span className="font-mono text-lg font-bold text-gray-800">{formatCurrency(totalSales)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 rounded-xl bg-[#510813]/5 hover:bg-[#510813]/10 transition-colors border-l-4 border-[#510813]">
                                <span className="font-black text-[#510813]">Amount Net of VAT</span>
                                <span className="font-mono text-xl font-bold text-[#510813]">{formatCurrency(netOfVat)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 rounded-xl bg-[#E5562E]/5 hover:bg-[#E5562E]/10 transition-colors border-b border-gray-100 pb-6 border-l-4 border-[#E5562E]">
                                <span className="font-black text-[#E5562E]">Add: VAT (12%)</span>
                                <span className="font-mono text-xl font-bold text-[#E5562E]">{formatCurrency(vatAmount)}</span>
                            </div>

                            <div className="flex justify-between items-center px-4 pt-4 border-t-2 border-dashed border-gray-200">
                                <span className="font-black text-2xl text-gray-800">TOTAL</span>
                                <span className="font-mono text-3xl font-black text-gray-900">{formatCurrency(totalSales)}</span>
                            </div>

                        </div>
                    </div>
                </div>

            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#510813] text-white">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Settings size={24} /> Default Unit Prices
                            </h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-500 mb-6">Set the default prices for each item. These will automatically load every time you open this page.</p>

                            {/* Default Price Inputs */}
                            {items.map(item => (
                                <div key={`setting-${item.id}`} className="flex items-center justify-between">
                                    <label className="font-bold text-gray-700 w-1/2">{item.name}</label>
                                    <div className="relative w-1/2">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₱</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={defaultPrices[item.id]}
                                            onChange={(e) => setDefaultPrices({ ...defaultPrices, [item.id]: e.target.value })}
                                            className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E5562E] focus:ring-2 focus:ring-[#E5562E]/20 font-mono text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors bg-white border border-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#E5562E] hover:bg-[#c94925] transition-colors flex items-center gap-2 shadow-md shadow-[#E5562E]/20"
                            >
                                <Save size={18} /> Save Defaults
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SampleComputation;
