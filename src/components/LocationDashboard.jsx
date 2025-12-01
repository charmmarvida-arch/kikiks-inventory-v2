import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { Eye, X } from 'lucide-react';

const LocationDashboard = () => {
    const { location } = useParams();
    const { transferOrders, updateTransferOrderStatus, inventory } = useInventory();
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Filter orders for this location
    // We use loose matching to handle potential URL encoding or case differences
    const filteredOrders = transferOrders.filter(order =>
        order.location === location ||
        order.location?.toLowerCase() === location.toLowerCase() ||
        (order.location && decodeURIComponent(location) === order.location)
    );

    // Sort by date (newest first)
    const sortedOrders = [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleStatusChange = (id, newStatus) => {
        updateTransferOrderStatus(id, newStatus);
    };

    return (
        <div className="fade-in">
            <div className="header-section">
                <h2 className="page-title">{decodeURIComponent(location)} Dashboard</h2>
                <p className="page-subtitle">Transaction History</p>
            </div>

            <div className="table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Branch Name</th>
                            <th>Category</th>
                            <th>Total Amount</th>
                            <th className="text-center">Details</th>
                            <th className="text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-state">
                                    No transactions found for this location.
                                </td>
                            </tr>
                        ) : (
                            sortedOrders.map(order => (
                                <tr key={order.id}>
                                    <td>{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="font-medium">{order.location}</td>
                                    <td>Stock Transfer</td>
                                    <td className="font-bold text-primary">₱{order.totalAmount.toLocaleString()}</td>
                                    <td className="text-center">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="icon-btn text-primary inline-flex items-center gap-1 w-auto px-2"
                                            title="View Details"
                                        >
                                            <Eye size={16} /> View
                                        </button>
                                    </td>
                                    <td className="text-center">
                                        <div className="status-select-wrapper">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                className={`status-badge status-${order.status.toLowerCase().replace(' ', '-')}`}
                                                style={{
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    appearance: 'none',
                                                    paddingRight: '1.5rem',
                                                    textAlign: 'center',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Transit">In Transit</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Transaction Details</h3>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">Branch Name</p>
                                    <p className="font-medium">{selectedOrder.location}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Type</p>
                                    <p className="font-medium">Stock Transfer</p>
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
                                                    <span className="block text-xs text-gray-500">
                                                        {inventory.find(i => i.sku === sku)?.description}
                                                    </span>
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
        </div>
    );
};

export default LocationDashboard;
