import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, Settings, ArrowUpDown, TrendingUp, TrendingDown, Users, Package, CheckCircle, Clock, Filter, FileText, AlertCircle } from 'lucide-react';
import ResellerSettingsModal from './ResellerSettingsModal';
import { generatePackingList } from '../utils/pdfGenerator';

const ResellerDashboard = () => {
    const { resellerOrders, updateResellerOrder, resellerSettings, inventory, resellers } = useInventory();
    const { userProfile } = useAuth();

    // PIN Protection State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    // Date Filter State  
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);

    // Modal State
    const [selectedReseller, setSelectedReseller] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Items Modal State
    const [selectedOrderItems, setSelectedOrderItems] = useState(null);
    const [showItemsModal, setShowItemsModal] = useState(false);

    // Sorting State
    const [sortDescending, setSortDescending] = useState(true);

    // Loading state for encoding toggle
    const [encodingLoading, setEncodingLoading] = useState({});

    // Optimistic UI state for encoding
    const [encodedOverrides, setEncodedOverrides] = useState({});

    // Settings Modal State  
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const sessionData = localStorage.getItem('resellerDashboardAccess');
        if (sessionData) {
            try {
                const parsed = JSON.parse(sessionData);
                if (parsed.authenticated === true) {
                    setIsAuthenticated(true);
                }
            } catch (e) {
                localStorage.removeItem('resellerDashboardAccess');
            }
        }

        // Set default date range to Month-to-date
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    // Handle PIN submission
    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pinInput === '1234') {
            setIsAuthenticated(true);
            localStorage.setItem('resellerDashboardAccess', JSON.stringify({ authenticated: true }));
            setPinError('');
            setPinInput('');
        } else {
            setPinError('Incorrect PIN. Please try again.');
            setPinInput('');
        }
    };

    // Filter orders by date range (exclude Christmas orders)
    const filteredOrders = useMemo(() => {
        return resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return orderDate >= start && orderDate <= end && ['Completed', 'Pending'].includes(order.status) && order.location !== 'Christmas Order';
        });
    }, [resellerOrders, startDate, endDate]);

    // Calculate previous period orders (for comparison)
    const previousPeriodOrders = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - daysDiff);
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);

        return resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= prevStart && orderDate <= prevEnd && ['Completed', 'Pending'].includes(order.status) && order.location !== 'Christmas Order';
        });
    }, [resellerOrders, startDate, endDate]);

    // Calculate monthly compliance data (rolling cycle)
    const monthlyComplianceData = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Helper to get current cycle for a specific start day
        const getCycle = (startDayStr) => {
            // Default to 1st of month if no start date set
            let startDay = 1;
            if (startDayStr) {
                const date = new Date(startDayStr);
                if (!isNaN(date.getTime())) {
                    startDay = date.getDate();
                }
            }

            // Determine if we are past the start day in current month
            // Example: Today Dec 7. Start Day 2. Cycle: Dec 2 - Jan 2.
            // Example: Today Dec 1. Start Day 2. Cycle: Nov 2 - Dec 2.

            let cycleStart = new Date(currentYear, currentMonth, startDay);
            let cycleEnd = new Date(currentYear, currentMonth + 1, startDay); // End is exclusive or inclusive? Let's say exclusive range [start, end) or inclusive [start, end-1]

            if (today < cycleStart) {
                // We are in the previous cycle
                cycleStart = new Date(currentYear, currentMonth - 1, startDay);
                cycleEnd = new Date(currentYear, currentMonth, startDay);
            }

            // Adjust end date to be end of day before next start day?
            // Or just use strict comparison >= start && < end
            // Let's set time to start of day
            cycleStart.setHours(0, 0, 0, 0);
            cycleEnd.setHours(0, 0, 0, 0);

            return { cycleStart, cycleEnd };
        };

        // Get all unique resellers (exclude Christmas orders)
        const uniqueResellers = new Set(resellerOrders.filter(o => o.location !== 'Christmas Order').map(o => o.resellerName));

        // Group orders by reseller (exclude Christmas orders)
        const groupedOrders = {};
        resellerOrders.filter(o => o.location !== 'Christmas Order').forEach(o => {
            if (!groupedOrders[o.resellerName]) groupedOrders[o.resellerName] = [];
            groupedOrders[o.resellerName].push(o);
        });

        const result = Array.from(uniqueResellers).map(resellerName => {
            const setting = resellerSettings.find(s => s.reseller_name === resellerName);
            const minimum = setting ? setting.minimum_monthly_order : 10000;
            const startDateStr = setting ? setting.start_date : null;

            const { cycleStart, cycleEnd } = getCycle(startDateStr);

            // Filter orders for this reseller in the current cycle
            const ordersInCycle = (groupedOrders[resellerName] || []).filter(order => {
                const orderDate = new Date(order.date);
                // Use >= start AND < end logic for 1 month exactly
                return orderDate >= cycleStart && orderDate < cycleEnd && ['Completed', 'Pending'].includes(order.status);
            });

            const ordersThisMonth = ordersInCycle.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

            // Determine Cycle Display String
            const cycleString = `${cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            let status;
            if (ordersThisMonth >= minimum) {
                status = 'met';
            } else if (ordersThisMonth > 0) {
                status = 'pending';
            } else {
                status = 'not_met';
            }

            return {
                resellerName,
                ordersThisMonth,
                minimum,
                status,
                cycleString // Add this for UI display
            };
        });

        // Sort by status
        result.sort((a, b) => {
            const statusOrder = { 'not_met': 0, 'pending': 1, 'met': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
        });

        return result;
    }, [resellerOrders, resellerSettings]);

    // Calculate metrics
    const metrics = useMemo(() => {
        // Current period metrics
        const totalOrders = filteredOrders.length;
        const activeResellers = new Set(filteredOrders.map(o => o.resellerName)).size;
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const encodedCount = filteredOrders.filter(o => o.is_encoded).length;
        const pendingEncoding = totalOrders - encodedCount;

        // Compliance Progress (Replaces Encoding Progress)
        // Count resellers with 'met' status from rolling cycle
        const compliantCount = monthlyComplianceData.filter(d => d.status === 'met').length;
        const totalResellersForCompliance = monthlyComplianceData.length;
        const complianceRate = totalResellersForCompliance > 0
            ? (compliantCount / totalResellersForCompliance) * 100
            : 0;

        // Year-to-Date calculation
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const ytdOrders = resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startOfYear && orderDate <= today && ['Completed', 'Pending'].includes(order.status);
        });
        const ytdRevenue = ytdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Previous year same period for YTD comparison
        const startOfPrevYear = new Date(today.getFullYear() - 1, 0, 1);
        const endOfPrevYearSamePeriod = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const prevYtdOrders = resellerOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startOfPrevYear && orderDate <= endOfPrevYearSamePeriod && ['Completed', 'Pending'].includes(order.status);
        });
        const prevYtdRevenue = prevYtdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Previous period metrics
        const prevTotalOrders = previousPeriodOrders.length;
        const prevActiveResellers = new Set(previousPeriodOrders.map(o => o.resellerName)).size;

        // Calculate changes
        const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
        const resellersChange = prevActiveResellers > 0 ? ((activeResellers - prevActiveResellers) / prevActiveResellers) * 100 : 0;
        const ytdChange = prevYtdRevenue > 0 ? ((ytdRevenue - prevYtdRevenue) / prevYtdRevenue) * 100 : 0;

        // Removing Encoding Change as it's no longer tracking encoding
        const complianceChange = 0; // Placeholder as we don't have historical compliance data easily accessible in this structure without more complex logic

        return {
            totalOrders,
            activeResellers,
            totalRevenue,
            ytdRevenue,
            complianceRate, // New metric
            pendingEncoding,
            ordersChange,
            resellersChange,
            ytdChange,
            complianceChange
        };
    }, [filteredOrders, previousPeriodOrders, resellerOrders, monthlyComplianceData]);

    // Aggregate orders by reseller
    const aggregatedData = useMemo(() => {
        const grouped = {};

        filteredOrders.forEach(order => {
            const resellerName = order.resellerName;
            if (!grouped[resellerName]) {
                grouped[resellerName] = {
                    resellerName,
                    totalAmount: 0,
                    orders: []
                };
            }
            grouped[resellerName].totalAmount += order.totalAmount || 0;
            grouped[resellerName].orders.push(order);
        });

        // Calculate YTD per reseller
        const currentYear = new Date().getFullYear();

        Object.values(grouped).forEach(reseller => {
            const resellerYtdOrders = resellerOrders.filter(order => {
                const orderDate = new Date(order.date);
                return order.resellerName === reseller.resellerName &&
                    orderDate.getFullYear() === currentYear &&
                    ['Completed', 'Pending'].includes(order.status);
            });
            reseller.ytdAmount = resellerYtdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        });



        let result = Object.values(grouped);
        result.sort((a, b) => {
            return sortDescending
                ? b.totalAmount - a.totalAmount
                : a.totalAmount - b.totalAmount;
        });

        return result;
    }, [filteredOrders, sortDescending]);

    // --- WIDGET LOGIC ---

    // 1. Top Movers (Best Sellers)
    const topMovers = useMemo(() => {
        const itemCounts = {};
        // Use filteredOrders to show movers for the selected period? Or all time?
        // Usually "Top Movers" implies recent activity, so filteredOrders (current month/period) is good.
        filteredOrders.forEach(order => {
            if (order.items) {
                Object.entries(order.items).forEach(([sku, qty]) => {
                    if (itemCounts[sku]) itemCounts[sku] += qty;
                    else itemCounts[sku] = qty;
                });
            }
        });

        // Convert to array and sort
        return Object.entries(itemCounts)
            .map(([sku, qty]) => {
                const item = inventory.find(i => i.sku === sku);
                return {
                    sku,
                    name: item ? item.description : sku,
                    qty
                };
            })
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 3);
    }, [filteredOrders, inventory]);

    // 2. Pending Collections (Unpaid/Active Orders, exclude Christmas)
    const pendingCollections = useMemo(() => {
        return resellerOrders
            .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled' && o.location !== 'Christmas Order')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [resellerOrders]);

    // Critical Alerts Logic - Tracks Pending Orders (exclude Christmas)
    const criticalAlerts = useMemo(() => {
        // Find all orders that are 'Pending'
        const pendingOrders = resellerOrders.filter(o => o.status === 'Pending' && o.location !== 'Christmas Order');

        // Sort by date ascending (oldest first)
        const sortedPending = [...pendingOrders].sort((a, b) => new Date(a.date) - new Date(b.date));

        return sortedPending.slice(0, 5).map(o => ({
            message: `${o.resellerName} has pending order`,
            type: 'pending_order',
            id: o.id
        }));
    }, [resellerOrders]);

    // 3. Global Progress (Revenue vs Target)
    // 3. Global Progress (Revenue vs Target)
    const globalProgress = useMemo(() => {
        const currentRevenue = metrics.totalRevenue; // From existing metrics

        // Sum targets for ALL resellers
        // If a reseller has a setting, use it. Otherwise use default 10,000.
        const totalTarget = resellers.reduce((sum, reseller) => {
            const setting = resellerSettings.find(s => s.reseller_name === reseller.name);
            const target = setting ? (setting.minimum_monthly_order || 10000) : 10000;
            return sum + target;
        }, 0);

        // Fallback only if no resellers exist at all
        const finalTarget = totalTarget > 0 ? totalTarget : 200000;
        const percentage = Math.min((currentRevenue / finalTarget) * 100, 100);
        return { currentRevenue, finalTarget, percentage };
    }, [metrics.totalRevenue, resellers, resellerSettings]);


    const handleViewResellerHistory = (resellerData) => {
        // Find ALL orders for this reseller from the main list (ignoring date filters)
        const allResellerOrders = resellerOrders.filter(o =>
            o.resellerName === resellerData.resellerName &&
            ['Completed', 'Pending'].includes(o.status)
        ).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

        // Calculate YTD (Current Year)
        const currentYear = new Date().getFullYear();
        const ytdAmount = allResellerOrders.reduce((sum, o) => {
            const orderDate = new Date(o.date);
            return orderDate.getFullYear() === currentYear ? sum + (o.totalAmount || 0) : sum;
        }, 0);

        // Calculate Total displayed in modal (can be All Time or Filtered - let's show All Time for context, or just override)
        // Let's stick to the aggregated structure but populate 'orders' with EVERYTHING.
        const fullHistoryReseller = {
            resellerName: resellerData.resellerName,
            totalAmount: allResellerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), // All time total
            ytdAmount: ytdAmount,
            orders: allResellerOrders
        };

        setSelectedReseller(fullHistoryReseller);
        setShowModal(true);
    };

    // Handle encoded toggle
    const handleEncodedToggle = async (order) => {
        // Determine current status (checking override first)
        const currentStatus = encodedOverrides.hasOwnProperty(order.id)
            ? encodedOverrides[order.id]
            : order.is_encoded;

        const newEncodedStatus = !currentStatus;
        const encodedBy = newEncodedStatus ? (userProfile?.email || 'Unknown User') : null;
        const encodedAt = newEncodedStatus ? new Date().toISOString() : null;

        // Optimistic UI Update: Set override immediately
        setEncodedOverrides(prev => ({ ...prev, [order.id]: newEncodedStatus }));

        try {
            await updateResellerOrder(order.id, {
                is_encoded: newEncodedStatus,
                encoded_by: encodedBy,
                encoded_at: encodedAt
            });
        } catch (error) {
            console.error('Error updating encoded status:', error);
            alert('Failed to update encoded status');

            // Revert override on error
            setEncodedOverrides(prev => {
                const newOverrides = { ...prev };
                delete newOverrides[order.id];
                return newOverrides;
            });
        }
    };

    // Handle View PDF
    const handleViewPDF = async (order) => {
        try {
            // Generate PDF Blob URL
            const url = await generatePackingList({ ...order, returnBlob: true }, inventory, resellerSettings); // inventory passed for descriptions
            window.open(url, '_blank');
        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Failed to open packing list");
        }
    };



    // PIN Entry Modal
    if (!isAuthenticated) {
        return (
            <div className="modal-overlay" style={{ display: 'flex' }}>
                <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Protected Section</h3>
                    </div>
                    <div className="modal-body">
                        <p className="text-secondary mb-4">Please enter PIN to access Reseller Dashboard</p>
                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                className="premium-input"
                                placeholder="Enter PIN"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                autoFocus
                                maxLength={4}
                            />
                            {pinError && (
                                <p className="text-danger text-sm mt-2">{pinError}</p>
                            )}
                            <div className="flex justify-end gap-4 mt-6">
                                <button type="submit" className="submit-btn">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Main Dashboard View
    return (
        <div className="fade-in" style={{ overflow: 'hidden', maxWidth: '100%' }}>
            <div className="header-section" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="page-title">Reseller Dashboard</h2>
                        <p className="page-subtitle">Executive overview of reseller performance</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {/* Settings Button Removed as per request (retained in Create Order only) */}
                        {/* <button
                            onClick={() => setShowSettingsModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '10px 20px',
                                backgroundColor: 'white',
                                border: '1.5px solid #64748b',
                                borderRadius: '50px',
                                color: '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(100, 116, 139, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#64748b';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = '#64748b';
                            }}
                        >
                            <Settings size={16} />
                            <span>Settings</span>
                        </button> */}
                        <button
                            onClick={() => setShowDateFilterModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '10px 20px',
                                backgroundColor: 'white',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '50px',
                                color: 'var(--primary)',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--primary)';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = 'var(--primary)';
                            }}
                        >
                            <Calendar size={16} />
                            <span>Filter</span>
                        </button>
                    </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    📅 {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </div>
            </div>

            {/* NEW CEO WIDGETS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem',
                maxWidth: '1150px',
                margin: '0 auto 2rem auto'
            }}>
                {/* 1. Critical Alerts */}
                <div className="dashboard-card" style={{ borderLeft: '4px solid #ef4444', padding: '1.25rem' }}>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingDown size={18} className="text-red-500" />
                        Critical Alerts
                    </h4>
                    <div className="flex flex-col gap-2">
                        {criticalAlerts.length === 0 ? (
                            <div className="text-green-600 text-sm font-medium flex items-center gap-2">
                                <CheckCircle size={14} /> All targets met!
                            </div>
                        ) : (
                            criticalAlerts.map((alert, i) => (
                                <div key={i} className="flex justify-between items-center text-sm bg-red-50 p-2 rounded text-red-700">
                                    <span className="truncate" title={alert.message}>{alert.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. Big Picture (Goal) */}
                <div className="dashboard-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h4 className="font-bold text-gray-800 mb-2 w-full text-left">Monthly Goal</h4>
                    <div style={{
                        position: 'relative',
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: `conic-gradient(var(--primary) ${globalProgress.percentage}%, #f3f4f6 ${globalProgress.percentage}% 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        <div style={{
                            width: '85%',
                            height: '85%',
                            background: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <span className="text-xl font-bold text-primary">{Math.round(globalProgress.percentage)}%</span>
                        </div>
                    </div>
                    <div className="text-xs text-secondary text-center">
                        ₱{globalProgress.currentRevenue.toLocaleString()} / ₱{globalProgress.finalTarget.toLocaleString()}
                    </div>
                </div>

                {/* 3. Top Movers */}
                <div className="dashboard-card" style={{ padding: '1.25rem' }}>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        Top Movers
                    </h4>
                    <div className="flex flex-col gap-3">
                        {topMovers.map((item, i) => (
                            <div key={item.sku} className="flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0">
                                <div className="flex items-center gap-2">
                                    <span style={{
                                        width: '18px', height: '18px', borderRadius: '50%', background: i === 0 ? '#FEF3C7' : '#f3f4f6',
                                        color: i === 0 ? '#D97706' : '#6b7280', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                    }}>{i + 1}</span>
                                    <span className="truncate font-medium text-gray-700" style={{ maxWidth: '100px' }} title={item.name}>{item.name.split(' ')[0]}...</span>
                                </div>
                                <span className="font-bold text-primary">{item.qty}</span>
                            </div>
                        ))}
                        {topMovers.length === 0 && <span className="text-secondary text-sm">No data yet.</span>}
                    </div>
                </div>

                {/* 4. Pending Collections */}
                <div className="dashboard-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        Pending Collections
                    </h4>
                    <div className="flex flex-col mt-2">
                        <span className="text-3xl font-bold text-gray-800">
                            ₱{pendingCollections.toLocaleString()}
                        </span>
                        <span className="text-xs text-secondary mt-1">
                            Total value of active/processing orders
                        </span>
                    </div>
                </div>
            </div>

            {/* Master Table: Performance Overview */}
            <div className="dashboard-card" style={{ marginBottom: '1.5rem', maxWidth: '1150px', margin: '0 auto 2rem auto' }}>
                <div className="card-header">
                    <h3 className="card-title">Reseller Performance Overview</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span className="text-secondary text-sm font-medium">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Cycle
                        </span>
                        <button
                            onClick={() => setSortDescending(!sortDescending)}
                            className="text-btn text-primary text-sm flex items-center gap-1 font-medium bg-gray-50 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowUpDown size={14} />
                            <span>{sortDescending ? 'Highest Sales' : 'Lowest Sales'}</span>
                        </button>
                    </div>
                </div>
                <div className="table-container shadow-none border-0" style={{ display: 'block', overflowX: 'auto' }}>
                    <table className="inventory-table" style={{ tableLayout: 'auto', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', width: '20%', fontSize: '1rem' }}>Reseller Name</th>
                                <th style={{ padding: '1rem', textAlign: 'left', width: '20%', fontSize: '1rem' }}>Compliance Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right', width: '20%', fontSize: '1rem' }}>Monthly Progress</th>
                                <th style={{ padding: '1rem', textAlign: 'right', width: '20%', fontSize: '1rem' }}>Filter Range Sales</th>
                                <th style={{ padding: '1rem', textAlign: 'center', width: '10%', fontSize: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyComplianceData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="empty-state text-center py-8 text-secondary">
                                        No resellers found.
                                    </td>
                                </tr>
                            ) : (
                                monthlyComplianceData.map(data => {
                                    const salesData = aggregatedData.find(d => d.resellerName === data.resellerName);
                                    const selectedPeriodSales = salesData ? salesData.totalAmount : 0;

                                    return (
                                        <tr key={data.resellerName} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{
                                                padding: '1.25rem 1rem',
                                                fontWeight: '600',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer',
                                                verticalAlign: 'middle',
                                                fontSize: '1.05rem'
                                            }}
                                                title={data.resellerName}
                                                onClick={() => handleViewResellerHistory(data)}
                                            >
                                                {data.resellerName}
                                            </td>

                                            {/* Compliance Status Column */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {data.status === 'met' && (
                                                            <span className="std-btn" style={{ backgroundColor: '#dcfce7', color: '#166534', cursor: 'default', padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                                                                ✓ Met
                                                            </span>
                                                        )}
                                                        {data.status === 'pending' && (
                                                            <span className="std-btn" style={{ backgroundColor: '#fef9c3', color: '#854d0e', cursor: 'default', padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                                                                ⏳ Pending
                                                            </span>
                                                        )}
                                                        {data.status === 'not_met' && (
                                                            <span className="std-btn" style={{ backgroundColor: '#fee2e2', color: '#991b1b', cursor: 'default', padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                                                                ✗ Not Met
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {data.cycleString}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Monthly Progress Column */}
                                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                        ₱{data.ordersThisMonth.toLocaleString()}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        Target: ₱{data.minimum.toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Filtered Sales Column */}
                                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                                <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1rem' }}>
                                                    ₱{selectedPeriodSales.toLocaleString()}
                                                </span>
                                            </td>

                                            {/* Actions Column */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <button
                                                    className="std-btn std-btn-primary"
                                                    onClick={() => handleViewResellerHistory(data)}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Explanatory Note */}
                <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}><AlertCircle size={16} /></div>
                    <div>
                        <p style={{ margin: 0, fontWeight: '600', marginBottom: '4px' }}>Why are the amounts different?</p>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyleType: 'disc', lineHeight: '1.4' }}>
                            <li><strong>Monthly Progress:</strong> Only counts sales within the store's specific contract cycle (e.g., Dec 12 - Jan 12).</li>
                            <li><strong>Filter Range Sales:</strong> Counts all sales within the dates selected in the top-right filter (e.g., Dec 1 - Today).</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Date Filter Modal */}
            {
                showDateFilterModal && (
                    <div className="modal-overlay" onClick={() => setShowDateFilterModal(false)}>
                        <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <Calendar size={20} />
                                    Date Range Filter
                                </h3>
                                <button className="close-btn" onClick={() => setShowDateFilterModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="grid-responsive two-cols">
                                    <div>
                                        <label className="form-label">Start Date</label>
                                        <input
                                            type="date"
                                            className="premium-input"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">End Date</label>
                                        <input
                                            type="date"
                                            className="premium-input"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-6">
                                    <button
                                        className="icon-btn px-4 w-auto"
                                        onClick={() => setShowDateFilterModal(false)}
                                    >
                                        Close
                                    </button>
                                    <button
                                        className="submit-btn"
                                        onClick={() => setShowDateFilterModal(false)}
                                    >
                                        Apply Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Order Details Modal */}
            {
                showModal && selectedReseller && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content medium-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    Orders - {selectedReseller.resellerName}
                                </h3>
                                <button className="close-btn" onClick={() => setShowModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
                                    <div>
                                        <div className="text-secondary text-sm font-medium">Total Order (YTD)</div>
                                        <div className="text-2xl font-bold text-primary">₱{selectedReseller.ytdAmount?.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-secondary text-sm">Reseller Name</div>
                                        <div className="font-semibold">{selectedReseller.resellerName}</div>
                                    </div>
                                </div>

                                <div className="scrollable-table-container" style={{ maxHeight: '500px' }}>
                                    <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                            <tr className="text-left text-sm text-secondary" style={{ borderBottom: '2px solid var(--border-color)' }}>
                                                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Date</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>Total Order</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>Encoded Status</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>Packing List</th>
                                            </tr>
                                        </thead>
                                        <tbody>

                                            {selectedReseller.orders.map((order, index) => {
                                                const isEncoded = encodedOverrides.hasOwnProperty(order.id) ? encodedOverrides[order.id] : order.is_encoded;
                                                return (
                                                    <tr
                                                        key={order.id}
                                                        style={{
                                                            borderBottom: index < selectedReseller.orders.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                            backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                                                        }}
                                                    >
                                                        <td style={{ padding: '16px' }}>
                                                            {new Date(order.date).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                                                            ₱{order.totalAmount?.toLocaleString() || '0'}
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                                            <button
                                                                className={`${isEncoded
                                                                    ? 'bg-green-100 text-green-700 border-green-300'
                                                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                                                    }`}
                                                                onClick={() => handleEncodedToggle(order)}
                                                                style={{
                                                                    padding: '6px 16px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: '600',
                                                                    border: '1px solid',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    minWidth: '120px'
                                                                }}
                                                            >
                                                                {isEncoded ? (
                                                                    <>✓ ENCODED</>
                                                                ) : (
                                                                    <>NOT ENCODED</>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                                            <button
                                                                className="text-btn text-primary text-sm font-medium flex items-center gap-1 justify-center"
                                                                onClick={() => handleViewPDF(order)}
                                                            >
                                                                <FileText size={16} />
                                                                View PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{
                                    marginTop: '1.5rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '2px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>

                                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Total Amount:</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        ₱{selectedReseller.totalAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <ResellerSettingsModal onClose={() => setShowSettingsModal(false)} />
                )
            }
        </div >
    );
};
export default ResellerDashboard;