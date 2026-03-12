
import React, { useState, useEffect } from 'react';
import { X, Search, Eye, Edit2, Trash2, Heart } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ValentinesHistoryModal = ({ isOpen, onClose, onEdit }) => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch orders when open
    useEffect(() => {
        if (isOpen) {
            fetchOrders();
        }
    }, [isOpen]);

    const fetchOrders = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('reseller_orders')
            .select('*')
            .eq('location', 'Valentines Order')
            .order('date', { ascending: false });
        if (data) setOrders(data);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (confirm("Delete this order permanently?")) {
            await supabase.from('reseller_orders').delete().eq('id', id);
            fetchOrders(); // Refresh
        }
    };

    // Status Change
    const handleStatus = async (id, status) => {
        await supabase.from('reseller_orders').update({ status }).eq('id', id);
        fetchOrders();
    };

    if (!isOpen) return null;

    const filteredOrders = orders.filter(o =>
        (o.reseller_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-[#510813] text-white p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Heart fill="white" className="text-white" />
                        <div>
                            <h2 className="text-2xl font-bold">Valentines Order History</h2>
                            <p className="text-white/60 text-sm">Track Cupid's deliveries</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
                </div>

                {/* Toolbar */}
                <div className="p-6 bg-pink-50 border-b border-pink-100 flex gap-4 flex-wrap">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-pink-100">
                        <div className="text-xs font-bold text-gray-400 uppercase">Revenue</div>
                        <div className="text-xl font-black text-[#D42426]">₱{totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-pink-100">
                        <div className="text-xs font-bold text-gray-400 uppercase">Count</div>
                        <div className="text-xl font-black text-[#D42426]">{filteredOrders.length}</div>
                    </div>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search recipient, sender..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-[#D42426] outline-none"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Name (To/From)</th>
                                <th className="p-4">Items</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-pink-50/50 transition-colors">
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(order.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-bold text-[#510813]">
                                        {order.reseller_name}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">
                                        {order.items && Object.keys(order.items).length} items
                                    </td>
                                    <td className="p-4 text-right font-bold text-[#D42426]">
                                        ₱{order.total_amount?.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatus(order.id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border-none bg-gray-100`}
                                        >
                                            <option>Pending</option>
                                            <option>Completed</option>
                                            <option>Cancelled</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => setSelectedOrder(order)} className="p-2 text-gray-400 hover:text-blue-600"><Eye size={18} /></button>
                                        <button onClick={() => onEdit(order)} className="p-2 text-gray-400 hover:text-green-600"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(order.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details Modal */}
            {selectedOrder && (
                <div onClick={() => setSelectedOrder(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 bg-[#510813] text-white flex justify-between">
                            <h3 className="font-bold text-lg">Order Details</h3>
                            <button onClick={() => setSelectedOrder(null)}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Names</label>
                                <div className="font-bold text-lg">{selectedOrder.reseller_name}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Details</label>
                                <div className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selectedOrder.address.replace(/\|\|/g, '\n')}</div>
                            </div>
                            <div className="pt-4 border-t">
                                <label className="text-xs font-bold text-gray-400 uppercase">Items</label>
                                {selectedOrder.items && Object.entries(selectedOrder.items).map(([sku, qty]) => (
                                    <div key={sku} className="flex justify-between text-sm py-1">
                                        <span>{sku}</span>
                                        <span className="font-bold">x{qty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValentinesHistoryModal;
