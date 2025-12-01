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

            {/* PDF Viewer */}
            <div className="flex-1 p-6 overflow-hidden flex justify-center">
                {pdfUrl ? (
                    <iframe
                        src={pdfUrl}
                        className="w-full max-w-5xl h-full rounded-xl shadow-2xl border border-gray-200 bg-white"
                        title="PDF Preview"
                    />
                ) : (
                    <div className="text-center text-gray-500 mt-20">
                        Failed to load PDF preview.
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Icon
const AlertCircle = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default OrderPdfView;
