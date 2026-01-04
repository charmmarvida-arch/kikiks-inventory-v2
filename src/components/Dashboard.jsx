import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useBranchInventory } from '../context/BranchInventoryContext';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, ArrowRightLeft, AlertTriangle, Search } from 'lucide-react';

const Dashboard = () => {
    const { inventory = [], resellerOrders = [], transferOrders = [], locationSRPs = {} } = useInventory();
    const { getBranchInventory, capacitySettings = [] } = useBranchInventory();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const branches = ['SM Sorsogon', 'SM Legazpi', 'Ayala Legazpi', 'SM Daet'];
    const sizeCategories = ['Cups', 'Pints', 'Liters', 'Gallons'];

    const getSizeCategoryFromSku = (sku) => {
        if (!sku) return null;
        const prefix = sku.split('-')[0];
        const sizeMap = {
            'FGC': 'Cups',
            'FGP': 'Pints',
            'FGL': 'Liters',
            'FGG': 'Gallons',
            'FGT': 'Trays'
        };
        return sizeMap[prefix] || null;
    };

    const getCapacityStats = (branch) => {
        // ... (existing helper code) ...
        const branchItems = getBranchInventory ? getBranchInventory(branch) : [];
        if (!Array.isArray(branchItems)) return { stats: [], latestDate: null, totalValue: 0 };

        // Calculate Total Stock Value
        const totalValue = branchItems.reduce((sum, item) => {
            if (!locationSRPs || !locationSRPs[branch]) return sum;
            const price = locationSRPs[branch][item.sku] || 0;
            return sum + ((item.current_stock || 0) * price);
        }, 0);

        // Find latest data timestamp (existing logic)
        const timestamps = branchItems
            .map(item => item.last_sync_date ? new Date(item.last_sync_date).getTime() : 0)
            .filter(Boolean);

        // ... (existing logic for timestamps) ...
        const latestDate = timestamps.length > 0
            ? new Date(Math.max(...timestamps)).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            })
            : null;

        const stats = sizeCategories.map(size => {
            // ... (existing logic) ...
            const settings = capacitySettings?.find(s =>
                s.branch_location === branch && s.size_category === size
            );

            if (!settings || !settings.max_capacity) return null;

            // Calculate current stock using SKU prefix matching
            const currentStock = branchItems
                .filter(item => getSizeCategoryFromSku(item.sku) === size)
                .reduce((sum, item) => sum + (parseInt(item.current_stock) || 0), 0);

            const percentage = Math.min(100, (currentStock / settings.max_capacity) * 100);

            return {
                size,
                current: currentStock,
                max: settings.max_capacity,
                percentage,
                isLow: currentStock < settings.min_stock_level,
                isCritical: currentStock >= settings.max_capacity
            };
        }).filter(Boolean);

        return { stats, latestDate, totalValue };
    };

    // ... (rest of logic) ...

    const lowStockCount = inventory.filter(i => i.quantity < 20).length;
    const pendingOrdersCount = resellerOrders.filter(o => o.status === 'Pending').length;
    const pendingTransfersCount = transferOrders.filter(o => o.status === 'Pending').length;

    // Filter orders based on search
    const filteredOrders = resellerOrders.filter(order =>
        order.resellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm)
    );

    return (
        <div className="fade-in">
            <div className="header-section" style={{ marginBottom: '1.5rem' }}>
                <h2 className="page-title" style={{ fontSize: '1.5rem' }}>Dashboard</h2>
                <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>Overview of your inventory and operations</p>
            </div>

            {/* Stats Grid - 4 Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 0 }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                        <Package size={20} />
                    </div>
                    <div>
                        <p className="text-secondary text-xs font-medium uppercase tracking-wide">Total Products</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{inventory.length}</h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 0 }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626' }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-secondary text-xs font-medium uppercase tracking-wide">Low Stock</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{lowStockCount}</h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 0 }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: '#fff7ed', color: '#ea580c' }}>
                        <ShoppingCart size={20} />
                    </div>
                    <div>
                        <p className="text-secondary text-xs font-medium uppercase tracking-wide">Pending Orders</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{pendingOrdersCount}</h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 0 }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#166534' }}>
                        <ArrowRightLeft size={20} />
                    </div>
                    <div>
                        <p className="text-secondary text-xs font-medium uppercase tracking-wide">Pending Transfers</p>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{pendingTransfersCount}</h3>
                    </div>
                </div>
            </div>

            {/* Branch Capacity Overview */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 className="card-heading" style={{ marginBottom: '1rem', fontSize: '1rem' }}>Branch Capacity Status</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    {branches.map(branch => {
                        const { stats, latestDate, totalValue } = getCapacityStats(branch);
                        // Only render card if there are stats or to encourage setting it up
                        return (
                            <div key={branch} className="card" style={{ padding: '1rem', marginBottom: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ padding: '0.4rem', borderRadius: '50%', backgroundColor: '#F3EBD8', color: '#510813' }}>
                                            <Package size={16} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: '600' }}>{branch}</h4>
                                            {latestDate && (
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280' }}>
                                                    Data: {latestDate}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">VALUE</p>
                                        <p className="text-lg font-black text-[#E5562E] leading-none">
                                            ₱{(totalValue || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {stats.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {stats.map(stat => (
                                            <div key={stat.size}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                    <span className="text-secondary font-medium">{stat.size}</span>
                                                    <span className={stat.isCritical ? 'text-red-600 font-bold' : stat.percentage > 80 ? 'text-amber-600 font-bold' : 'text-secondary'}>
                                                        {stat.current} / {stat.max} ({Math.round(stat.percentage)}%)
                                                        {stat.current > stat.max && ' ⚠️'}
                                                    </span>
                                                </div>
                                                <div style={{ height: '6px', backgroundColor: 'var(--gray-100)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            width: `${stat.percentage}%`,
                                                            backgroundColor: stat.percentage > 90 ? '#dc2626' : stat.percentage > 70 ? '#f59e0b' : '#166534',
                                                            transition: 'width 0.5s ease-in-out'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-secondary text-sm italic py-2 text-center bg-gray-50 rounded">
                                        No capacity settings
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area - Flex Layout */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Quick Actions - Fixed Width */}
                <div style={{ width: '280px', flexShrink: 0 }}>
                    <h3 className="card-heading" style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            onClick={() => navigate('/stock-in')}
                            className="card hover-card"
                            style={{ textAlign: 'left', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', marginBottom: 0 }}
                        >
                            <div style={{ color: '#2563eb' }}><Package size={20} /></div>
                            <div>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '0' }}>Stock In</h4>
                                <p className="text-secondary text-xs">Add new stock</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/reseller-order')}
                            className="card hover-card"
                            style={{ textAlign: 'left', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', marginBottom: 0 }}
                        >
                            <div style={{ color: '#ea580c' }}><ShoppingCart size={20} /></div>
                            <div>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '0' }}>Create Order</h4>
                                <p className="text-secondary text-xs">For reseller</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/transfer')}
                            className="card hover-card"
                            style={{ textAlign: 'left', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', marginBottom: 0 }}
                        >
                            <div style={{ color: '#166534' }}><ArrowRightLeft size={20} /></div>
                            <div>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '0' }}>Transfer Stock</h4>
                                <p className="text-secondary text-xs">To locations</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Recent Orders - Flexible Width */}
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-heading" style={{ marginBottom: 0, border: 'none', padding: 0, fontSize: '1rem' }}>Recent Orders</h3>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search reseller..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        padding: '0.4rem 0.75rem 0.4rem 2.25rem',
                                        fontSize: '0.875rem',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        outline: 'none',
                                        width: '200px'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
                            {filteredOrders.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center' }} className="text-secondary text-sm">
                                    {searchTerm ? 'No matching orders found' : 'No recent orders'}
                                </div>
                            ) : (
                                <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: '600' }} className="text-secondary">Reseller</th>
                                            <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: '600' }} className="text-secondary">Date</th>
                                            <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: '600' }} className="text-secondary">Amount</th>
                                            <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontWeight: '600' }} className="text-secondary">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.slice(0, 10).map((order) => (
                                            <tr
                                                key={order.id}
                                                style={{ borderBottom: '1px solid var(--gray-100)' }}
                                                className="hover:bg-gray-50"
                                            >
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{order.resellerName}</td>
                                                <td style={{ padding: '0.75rem 1rem' }} className="text-secondary">{new Date(order.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>₱{order.totalAmount.toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                    <span className={`status-badge status-${order.status.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', backgroundColor: 'var(--base-white)' }}>
                            <button
                                onClick={() => navigate('/reseller-order-list')}
                                className="text-primary"
                                style={{ fontSize: '0.8125rem', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                View All Orders
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
