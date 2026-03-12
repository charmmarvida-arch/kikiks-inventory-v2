import React, { useState } from 'react';
import { X, Search, Eye, Edit2, Trash2 } from 'lucide-react';

const ChristmasHistoryModal = ({
    orders,
    inventory,
    onClose,
    onStatusChange,
    onEdit,
    onDelete,
    isProcessing // To disable actions while updating
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Filter orders
    const filteredOrders = orders
        .filter(order =>
            order.resellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.reseller_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary Stats
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || o.total_amount || 0), 0);
    const totalOrders = filteredOrders.length;

    // Helper to get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'active': return 'bg-blue-100 text-blue-800';
            case 'processing': return 'bg-purple-100 text-purple-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#0f172a] text-white p-6 flex justify-between items-center shadow-md shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🎇</span>
                            <h2 className="text-2xl font-bold tracking-tight">Order History</h2>
                        </div>
                        <p className="text-white/70 text-sm">Manage and track your holiday orders</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Cards & Toolbar */}
                <div className="p-6 bg-gray-50 border-b border-gray-200 shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Stat Cards */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Total Revenue</h3>
                            <div className="text-2xl font-bold text-[#D97706]">₱{totalRevenue.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Total Orders</h3>
                            <div className="text-2xl font-bold text-[#0f172a]">{totalOrders}</div>
                        </div>
                        {/* Search Bar */}
                        <div className="lg:col-span-2 flex items-center">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by Reseller Name..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Date / Time</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Reseller</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Items Summary</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Total Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        No orders found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="font-medium text-gray-900">{new Date(order.date).toLocaleDateString()}</div>
                                            <div className="text-xs">{new Date(order.date).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {order.resellerName || order.reseller_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[250px] truncate">
                                            {order.items && Object.entries(order.items)
                                                .map(([sku, qty]) => `${qty}x ${sku.split('-')[0]}`)
                                                .join(', ')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-[#D97706]">
                                            ₱{(order.totalAmount || order.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <select
                                                value={order.status}
                                                onChange={(e) => onStatusChange(order.id, e.target.value)}
                                                disabled={isProcessing}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer appearance-none text-center ${getStatusColor(order.status)}`}
                                                style={{ textAlignLast: 'center' }}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Active">Active</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 text-gray-400">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-2 rounded-lg hover:bg-[#0F4C25]/10 hover:text-[#0F4C25] transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onEdit(order)}
                                                    className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    title="Edit Order"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(order.id)}
                                                    className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    title="Delete Order"
                                                >
                                                    <Trash2 size={18} />
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

            {/* Add/Edit Item Modal */}


            {/* View Details Modal Overlay */}
            {selectedOrder && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Order Details</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reseller</label>
                                    <div className="font-medium text-lg">{selectedOrder.resellerName || selectedOrder.reseller_name}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</label>
                                    <div className="text-gray-700">{selectedOrder.address || 'Pickup'}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items</label>
                                    <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded-lg max-h-[200px] overflow-y-auto">
                                        {selectedOrder.items && Object.entries(selectedOrder.items).map(([sku, qty]) => (
                                            <div key={sku} className="flex justify-between text-sm">
                                                <span className="text-gray-700 font-medium">
                                                    {inventory.find(i => i.sku === sku)?.description || sku}
                                                </span>
                                                <span className="font-bold text-gray-900">x{qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <span className="font-bold text-gray-500">Total</span>
                                    <span className="font-bold text-2xl text-[#D42426]">₱{(selectedOrder.totalAmount || selectedOrder.total_amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 text-center">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChristmasHistoryModal;
