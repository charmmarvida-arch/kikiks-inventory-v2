import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { generatePackingList } from '../utils/pdfGenerator';
import { ArrowLeft, Download, FileText } from 'lucide-react';

const OrderPdfView = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { resellerOrders, inventory, resellerPrices } = useInventory();
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);

    useEffect(() => {
        if (resellerOrders.length > 0) {
            const foundOrder = resellerOrders.find(o => o.id === orderId);
            if (foundOrder) {
                setOrder(foundOrder);
                generatePdf(foundOrder);
            } else {
                // If not found in context (maybe page refresh), we might need to fetch from DB or wait.
                // For now, assume context loads eventually.
                // If context is loaded but order not found, it's an error.
                setLoading(false);
            }
        }
    }, [orderId, resellerOrders]);

    const generatePdf = async (orderData) => {
        try {
            const url = await generatePackingList(
                { ...orderData, returnBlob: true },
                inventory,
                resellerPrices
            );
            setPdfUrl(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF preview.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (order) {
            generatePackingList(order, inventory, resellerPrices);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Generating Invoice...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                    <h2 className="text-xl font-bold text-gray-800">Order Not Found</h2>
                    <p className="text-gray-500 mb-6">The requested order could not be found.</p>
                    <button onClick={() => navigate('/reseller-order')} className="text-blue-600 hover:underline">
                        Go back to Order Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/reseller-order')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        title="New Order"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" />
                            Order #{order.id.slice(0, 8)}...
                        </h1>
                        <p className="text-xs text-gray-500">
                            {order.resellerName} • {new Date(order.date).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/reseller-order')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        New Order
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                    >
                        <Download size={16} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* HTML Order Summary (Replaces iframe for better visibility) */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-100 flex justify-center">
                <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200 flex flex-col">

                    {/* Document Header */}
                    <div className="p-8 border-b border-gray-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">PACKING LIST</h1>
                                <div className="text-sm text-gray-500 space-y-1">
                                    <p>242 Burgos Street</p>
                                    <p>Brgy San Juan (Roro)</p>
                                    <p>Sorsogon City</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100">
                                    <div className="text-xs font-bold uppercase tracking-wider mb-1">Order Date</div>
                                    <div className="text-lg font-bold">{new Date(order.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To Section */}
                    <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</h3>
                            <div className="font-bold text-xl text-gray-800">{order.resellerName}</div>
                            <div className="text-gray-600">{order.location}</div>
                            <div className="text-gray-600">{order.address || 'No address provided'}</div>
                        </div>
                        <div className="md:text-right">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order ID</h3>
                            <div className="font-mono text-gray-600">{order.id}</div>
                        </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="p-8">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100">
                                    <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Packs</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Pcs/Pack</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Qty</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Price</th>
                                    <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {['FGC', 'FGP', 'FGL', 'FGG', 'FGT'].map(prefix => {
                                    const itemsInGroup = Object.entries(order.items)
                                        .filter(([sku, qty]) => sku.startsWith(prefix) && qty > 0)
                                        .map(([sku, qty]) => {
                                            const itemDef = inventory.find(i => i.sku === sku);

                                            // Price Logic (Same as PDF)
                                            let price = 0;
                                            // 1. Zone Specific
                                            const zoneId = resellerOrders.find(o => o.id === order.id)?.zone_id; // Need to find zone if possible, or rely on passed props. 
                                            // Actually, order object might not have zone_id directly if not saved, but we have location name. 
                                            // Let's use the logic from pdfGenerator or ResellerOrderRedesigned.
                                            // Ideally we should have saved the price snapshot in the order items, but we didn't.
                                            // We will approximate using the same logic:

                                            // Fallback constants
                                            const PRICE_MAP = { 'FGC': 23, 'FGP': 85, 'FGL': 170, 'FGG': 680, 'FGT': 1000 };
                                            price = PRICE_MAP[prefix] || 0;

                                            // Try to find price from context if possible
                                            if (order.location && resellerPrices && resellerPrices[order.location] && resellerPrices[order.location][prefix]) {
                                                price = resellerPrices[order.location][prefix];
                                            }

                                            const totalCost = price * qty;
                                            const packSize = prefix === 'FGC' ? 10 : 1; // Simple pack size logic

                                            return {
                                                sku,
                                                description: itemDef ? itemDef.description : sku,
                                                qty,
                                                packSize,
                                                price,
                                                totalCost,
                                                numPacks: packSize > 1 ? (qty / packSize).toFixed(1) : ''
                                            };
                                        });

                                    if (itemsInGroup.length === 0) return null;

                                    const groupTotalQty = itemsInGroup.reduce((sum, item) => sum + item.qty, 0);

                                    return (
                                        <React.Fragment key={prefix}>
                                            {itemsInGroup.map(item => (
                                                <tr key={item.sku}>
                                                    <td className="py-3 text-sm font-medium text-gray-800">{item.description}</td>
                                                    <td className="py-3 text-sm text-gray-600 text-center">{item.numPacks}</td>
                                                    <td className="py-3 text-sm text-gray-600 text-center">{item.packSize}</td>
                                                    <td className="py-3 text-sm font-bold text-gray-800 text-center">{item.qty}</td>
                                                    <td className="py-3 text-sm text-gray-600 text-right">₱{item.price.toLocaleString()}</td>
                                                    <td className="py-3 text-sm font-bold text-gray-800 text-right">₱{item.totalCost.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {/* Group Total Row */}
                                            <tr className="bg-yellow-50/50">
                                                <td colSpan="3" className="py-2 text-xs font-bold text-gray-500 text-right uppercase pr-4">
                                                    Total {prefix === 'FGC' ? 'Cups' : prefix === 'FGP' ? 'Pints' : prefix === 'FGL' ? 'Liters' : prefix === 'FGG' ? 'Gallons' : 'Trays'}
                                                </td>
                                                <td className="py-2 text-sm font-bold text-gray-800 text-center">{groupTotalQty}</td>
                                                <td colSpan="2"></td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-100">
                                    <td colSpan="5" className="py-6 text-right text-xl font-bold text-gray-800">TOTAL BILL</td>
                                    <td className="py-6 text-right text-2xl font-black text-[#E5562E]">
                                        ₱{order.totalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="bg-gray-50 p-8 border-t border-gray-100 text-xs text-gray-500">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div>
                                    <div className="mb-2 font-bold uppercase">Prepared By:</div>
                                    <div className="h-8 border-b border-gray-300"></div>
                                </div>
                                <div>
                                    <div className="mb-2 font-bold uppercase">Confirmed By:</div>
                                    <div className="h-8 border-b border-gray-300"></div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <div className="mb-2 font-bold uppercase">Date & Time:</div>
                                    <div className="h-8 border-b border-gray-300"></div>
                                </div>
                                <div>
                                    <div className="mb-2 font-bold uppercase">Received By:</div>
                                    <div className="h-8 border-b border-gray-300"></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 text-center opacity-50">
                            Generated via Kikiks Inventory System
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Icon
const AlertCircle = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default OrderPdfView;
