import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  Settings,
  ChevronDown,
  LogOut,
  ClipboardList,
  Box,
  Store,
  Layers,
  Heart,
  Gift,
  BarChart3,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';

const Sidebar = ({ isOpen, onClose }) => {
  const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { logout, userProfile } = useAuth();
  const { kikiksLocations } = useInventory();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const hasPermission = (key) => {
    if (!userProfile) return true;
    if (userProfile.role === 'admin') return true;
    return userProfile.permissions?.[key] === true;
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-primary">
              <Box size={24} strokeWidth={2.5} />
            </div>
            <span>Kikiks Inventory</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="sidebar-nav">
          {hasPermission('dashboard') && (
            <div className="nav-item">
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
                end
              >
                <span className="nav-icon"><LayoutDashboard size={20} /></span>
                Dashboard
              </NavLink>
            </div>
          )}

          {hasPermission('ftf_manufacturing') && (
            <div className="nav-item">
              <div className="nav-section-label">FTF Manufacturing & Warehouse</div>
              <NavLink
                to="/dashboard/ftf-manufacturing"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon"><Package size={20} /></span>
                FTF Manufacturing
              </NavLink>
              <NavLink
                to="/dashboard/ftf-materials"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon"><Layers size={20} /></span>
                Materials
              </NavLink>
              <NavLink
                to="/dashboard/legazpi-storage"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="nav-icon"><Package size={20} /></span>
                Legazpi Storage
              </NavLink>
            </div>
          )}



          {hasPermission('stock_movement') && (
            <div className="nav-item">
              <div className="nav-section-label">Inventory</div>
              <div
                className={`nav-link ${isStockMovementOpen ? 'active' : ''}`}
                onClick={() => setIsStockMovementOpen(!isStockMovementOpen)}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon"><ArrowRightLeft size={20} /></span>
                Stock Movement
                <ChevronDown size={16} className={`nav-arrow ${isStockMovementOpen ? 'open' : ''}`} />
              </div>

              <div className={`submenu ${isStockMovementOpen ? 'open' : ''}`}>
                <NavLink to="/stock-in" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span>Stock In</span>
                </NavLink>
                <NavLink to="/transfer" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span>Transfer Location</span>
                </NavLink>
                <NavLink to="/branch-inventory" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span>Branch Inventory</span>
                </NavLink>
              </div>
            </div>
          )}

          {hasPermission('reseller_orders') && (
            <div className="nav-item">
              <div className="nav-section-label">Reseller Orders</div>
              <NavLink to="/reseller-order" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon"><ShoppingCart size={20} /></span>
                Create Order
              </NavLink>
              <NavLink to="/valentines-order" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose} style={{ color: '#D42426' }}>
                <span className="nav-icon"><Heart size={20} /></span>
                Valentines Order
              </NavLink>
              <NavLink to="/reseller-orders-list" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon"><ClipboardList size={20} /></span>
                Pending Orders
              </NavLink>
              <NavLink to="/order-history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon"><ClipboardList size={20} /></span>
                Order History
              </NavLink>
              <NavLink to="/reseller-dashboard-final" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="nav-icon"><ClipboardList size={20} /></span>
                Reseller Dashboard
              </NavLink>
            </div>
          )}

          <div className="nav-item">
            <div className="nav-section-label">Sales Invoice</div>
            <NavLink to="/sample-computation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="nav-icon"><Receipt size={20} /></span>
              Sample Computation
            </NavLink>
          </div>

          <div className="nav-item">
            <div className="nav-section-label">Kikiks Branches</div>
            {kikiksLocations
              .filter(location => location !== 'FTF Manufacturing' && location !== 'Legazpi Storage' && !location.startsWith('Namito'))
              .map(location => (
                <NavLink
                  key={location}
                  to={`/dashboard/${location}`}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon"><Store size={20} /></span>
                  {location}
                </NavLink>
              ))}
          </div>

          <div className="nav-item">
            <div className="nav-section-label">Namito Branches</div>
            {kikiksLocations
              .filter(location => location.startsWith('Namito'))
              .map(location => (
                <NavLink
                  key={location}
                  to={`/dashboard/${location}`}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon"><Store size={20} /></span>
                  {location}
                </NavLink>
              ))}
          </div>

          {hasPermission('settings') && (
            <div className="nav-item">
              <div
                className={`nav-link ${isSettingsOpen ? 'active' : ''}`}
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon"><Settings size={20} /></span>
                Settings
                <ChevronDown size={16} className={`nav-arrow ${isSettingsOpen ? 'open' : ''}`} />
              </div>

              <div className={`submenu ${isSettingsOpen ? 'open' : ''}`}>
                <NavLink to="/settings/sku-addition" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span>SKU Addition</span>
                </NavLink>
                <NavLink to="/settings/admin-key" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span>Admin Key</span>
                </NavLink>
                <NavLink to="/settings/register" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                  <span>Account Register</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}
          >
            <span className="nav-icon"><LogOut size={20} /></span>
            Logout
          </button>
        </div>
      </nav >
    </>
  );
};

export default Sidebar;
