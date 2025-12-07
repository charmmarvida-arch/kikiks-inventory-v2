import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import InventoryTable from './components/InventoryTable';
import StockIn from './components/StockIn';
import Login from './components/Login';
import RegisterAccount from './components/RegisterAccount';

import Dashboard from './components/Dashboard';

import LocationDashboard from './components/LocationDashboard';
import TransferLocation from './components/TransferLocation';
import ResellerOrderRedesigned from './components/ResellerOrderRedesigned';
import OrderPdfView from './components/OrderPdfView';
import ResellerOrderList from './components/ResellerOrderList';
import OrderHistory from './components/OrderHistory';
import ResellerDashboard from './components/ResellerDashboard';
import SettingsSku from './components/SettingsSku';
import FTFManufacturing from './components/FTFManufacturing';
import LegazpiStorage from './components/LegazpiStorage';
import AdminKey from './components/AdminKey';


// Domain Guard Component
const MainDomainGuard = ({ children }) => {
  const hostname = window.location.hostname;
  // Allow localhost, 127.0.0.1, and the main production domain
  const isMainDomain = hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname === 'kikiks-orders.vercel.app';

  if (!isMainDomain) {
    return <Navigate to="/public-transfer" replace />;
  }

  return children;
};

// Protected Route Wrapper
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <MainDomainGuard>
                <Login />
              </MainDomainGuard>
            } />
            <Route path="/public-order" element={<ResellerOrderRedesigned isPublic={true} />} />
            <Route path="/public-transfer" element={<TransferLocation isPublic={true} />} />
            <Route path="/order-pdf/:orderId" element={<OrderPdfView />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <MainDomainGuard>
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              </MainDomainGuard>
            }>
              <Route index element={<Dashboard />} />
              <Route path="dashboard/ftf-manufacturing" element={<FTFManufacturing />} />
              <Route path="dashboard/legazpi-storage" element={<LegazpiStorage />} />
              <Route path="dashboard/:location" element={<LocationDashboard />} />
              <Route path="stock-in" element={<StockIn />} />
              <Route path="transfer" element={<TransferLocation />} />
              <Route path="reseller-order" element={<ResellerOrderRedesigned />} />
              <Route path="reseller-order/edit/:orderId" element={<ResellerOrderRedesigned />} />
              <Route path="reseller-orders-list" element={<ResellerOrderList />} />
              <Route path="order-history" element={<OrderHistory />} />
              <Route path="reseller-dashboard" element={<ResellerDashboard />} />
              <Route path="settings/sku-addition" element={<SettingsSku />} />
              <Route path="settings/admin-key" element={<AdminKey />} />
              <Route path="settings/register" element={<RegisterAccount />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </InventoryProvider>
    </AuthProvider>
  );
}

export default App;
