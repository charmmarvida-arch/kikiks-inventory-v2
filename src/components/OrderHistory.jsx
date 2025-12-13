import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Eye, X, Search } from 'lucide-react';
import { generatePackingList, generateCOA } from '../utils/pdfGenerator';

const OrderHistory = () => {
    const { resellerOrders, inventory, resellerPrices } = useInventory();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Preview Modal State
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');

    const [selectedReseller, setSelectedReseller] = useState('');

    // Get unique resellers from completed orders
    const uniqueResellers = [...new Set(resellerOrders
        .filter(order => order.status === 'Completed')
        .map(order => order.resellerName))];

    // Filter for COMPLETED orders only
    const historyOrders = resellerOrders
        .filter(order =>
            order.status === 'Completed' &&
            (selectedReseller === '' || order.resellerName === selectedReseller) &&
            (order.resellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.location.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending (Newest first)

    const handleViewPackingList = async (order) => {
        try {
            const url = await generatePackingList({ ...order, returnBlob: true }, inventory, resellerPrices);
            setPreviewUrl(url);
            setPreviewTitle(`Packing List - ${order.resellerName}`);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing packing list:", error);
            alert("Failed to view packing list.");
        }
    };

    const handleViewCOA = async (order) => {
        try {
            const url = await generateCOA({ ...order, returnBlob: true }, order.coaData || {}, inventory);
            setPreviewUrl(url);
            setPreviewTitle(`COA - ${order.resellerName}`);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Error viewing COA:", error);
            alert("Failed to view COA.");
        }
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">Order History</h2>
                <p className="page-subtitle">Archive of completed transactions</p>
            </div>

            <div className="form-card p-0 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', gap: '1rem' }}>
                    <h3 className="card-heading" style={{ fontSize: '1rem', marginBottom: 0, border: 'none', padding: 0 }}>Completed Orders</h3>

                    <div className="flex gap-4 items-center">
                        {/* Reseller Filter */}
                        <select
                            value={selectedReseller}
                            onChange={(e) => setSelectedReseller(e.target.value)}
                            style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                outline: 'none',
                                minWidth: '150px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">All Resellers</option>
                            {uniqueResellers.map(reseller => (
                                <option key={reseller} value={reseller}>{reseller}</option>
                            ))}
                        </select>

                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.3rem 0.6rem 0.3rem 2rem',
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    outline: 'none',
                                    width: '250px'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', margin: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }}>
                    <table className="inventory-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--base-white)' }}>
                            <tr>
                                <th>Date</th>
                                <th>Reseller Name</th>
                                <th>Category</th>
                                <th>Total Amount</th>
                                <th className="text-center">Details</th>
                                <th className="text-center">Packing List</th>
                                <th className="text-center">COA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-state">
                                        No completed orders found.
                                    </td>
                                </tr>
                            ) : (
                                historyOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>{new Date(order.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{order.resellerName}</td>
                                        <td>{order.location}</td>
                                        <td className="font-bold">₱{order.totalAmount.toLocaleString()}</td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setShowDetailsModal(true);
                                                }}
                                                style={{
                                                    width: '85px',
                                                    padding: '0',
                                                    height: '28px',
                                                    border: 'none',
                                                    color: 'white',
                                                    background: 'var(--primary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    borderRadius: '50px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="View Details"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                        <td className="text-center">
                                            {order.hasPackingList ? (
                                                <button
                                                    onClick={() => handleViewPackingList(order)}
                                                    style={{
                                                        width: '85px',
                                                        height: '28px',
                                                        backgroundColor: 'var(--primary)',
                                                        color: 'white',
                                                        padding: '0',
                                                        borderRadius: '50px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        border: 'none',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    View PDF
                                                </button>
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '85px',
                                                        height: '28px',
                                                        backgroundColor: 'var(--gray-100)',
                                                        color: 'var(--text-muted)',
                                                        padding: '0',
                                                        borderRadius: '50px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '600',
                                                        border: '1px solid var(--border-color)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    Not Created
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {order.hasCOA ? (
                                                <button
                                                    onClick={() => handleViewCOA(order)}
                                                    style={{
                                                        width: '85px',
                                                        height: '28px',
                                                        backgroundColor: 'var(--primary)',
                                                        color: 'white',
                                                        padding: '0',
                                                        borderRadius: '50px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        border: 'none',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    View COA
                                                </button>
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '85px',
                                                        height: '28px',
                                                        backgroundColor: 'var(--gray-100)',
                                                        color: 'var(--text-muted)',
                                                        padding: '0',
                                                        borderRadius: '50px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '600',
                                                        border: '1px solid var(--border-color)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    Not Created
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Order Details</h3>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">Reseller</p>
                                    <p className="font-medium">{selectedOrder.resellerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Category</p>
                                    <p className="font-medium">{selectedOrder.location}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Date</p>
                                    <p className="font-medium">{new Date(selectedOrder.date).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Amount</p>
                                    <p className="font-bold text-primary">₱{selectedOrder.totalAmount.toLocaleString()}</p>
                                </div>
                            </div>

                            <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-gray-500">Items</h4>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200">
                                            <th className="pb-2">Item</th>
                                            <th className="pb-2 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(selectedOrder.items).map(([sku, qty]) => (
                                            <tr key={sku} className="border-b border-gray-100 last:border-0">
                                                <td className="py-2">
                                                    <span className="font-medium text-gray-700">{sku}</span>
                                                    <span className="block text-xs text-gray-500">{inventory.find(i => i.sku === sku)?.description}</span>
                                                </td>
                                                <td className="py-2 text-right font-medium">{qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {showPreviewModal && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content large-modal" style={{ width: '90%', height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{previewTitle}</h3>
                            <div className="flex gap-2">
                                <a
                                    href={previewUrl}
                                    download={`${previewTitle.replace(/\s+/g, '_')}.pdf`}
                                    className="icon-btn text-primary"
                                    title="Download PDF"
                                    style={{ padding: '4px 8px', height: 'auto', fontSize: '0.8rem' }}
                                >
                                    Download PDF
                                </a>
                                <button className="close-btn" onClick={() => setShowPreviewModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="modal-body" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                            <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Preview" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderHistory;
