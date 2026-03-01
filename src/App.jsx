import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { InventoryProvider } from './context/InventoryContext';
import { BranchInventoryProvider } from './context/BranchInventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import InventoryTable from './components/InventoryTable';
import StockIn from './components/StockIn';
import Login from './components/Login';
import RegisterAccount from './components/RegisterAccount';
import SampleComputation from './components/SampleComputation';

import Dashboard from './components/Dashboard';

import LocationDashboard from './components/LocationDashboard';
import TransferLocation from './components/TransferLocation';
import BranchStockPrintView from './components/BranchStockPrintView';
import ResellerOrderRedesigned from './components/ResellerOrderRedesigned';
// import ChristmasOrder from './components/ChristmasOrder'; // Lazy loaded below
import OrderPdfView from './components/OrderPdfView';
import ResellerOrderList from './components/ResellerOrderList';
import OrderHistory from './components/OrderHistory';
import ResellerDashboard from './components/ResellerDashboard';
import SettingsSku from './components/SettingsSku';
import FTFManufacturing from './components/FTFManufacturing';
import FTFMaterials from './components/FTFMaterials';
import LegazpiStorage from './components/LegazpiStorage';
import AdminKey from './components/AdminKey';
import BranchInventory from './components/BranchInventory';

// Lazy Load Valentines Order for performance
const ValentinesOrder = React.lazy(() => import('./components/ValentinesOrder'));

// Loading Fallback Component
const ValentinesLoader = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#FFF0F5] text-[#510813]">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#D42426] mb-4"></div>
    <h2 className="text-2xl font-black tracking-widest animate-pulse text-[#D42426]">LOADING VALENTINES...</h2>
  </div>
);




// Domain Middleware Component
const DomainMiddleware = ({ children }) => {
  const location = useLocation();
  const hostname = window.location.hostname;

  // 1. kikiks-orders -> Reseller Order Only
  if (hostname.includes('kikiks-orders') && location.pathname !== '/public-order') {
    return <Navigate to="/public-order" replace />;
  }

  // 2. kikiks-transfer -> Transfer Location Only
  if (hostname.includes('kikiks-transfer') && location.pathname !== '/public-transfer') {
    return <Navigate to="/public-transfer" replace />;
  }

  // 3. kikiks-inventory (or others like localhost) -> Full Access
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
        <BranchInventoryProvider>
          <BrowserRouter>
            <DomainMiddleware>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/public-order" element={<ResellerOrderRedesigned isPublic={true} />} />
                <Route path="/public-transfer" element={<TransferLocation isPublic={true} />} />
                <Route path="/valentines-order" element={
                  <React.Suspense fallback={<ValentinesLoader />}>
                    <ValentinesOrder isPublic={true} />
                  </React.Suspense>
                } />
                <Route path="/christmas-order" element={<Navigate to="/valentines-order" replace />} />
                <Route path="/new-year-order" element={<Navigate to="/valentines-order" replace />} />
                <Route path="/order-pdf/:orderId" element={<OrderPdfView />} />
                <Route path="/print-stocks/:location" element={
                  <RequireAuth>
                    <BranchStockPrintView />
                  </RequireAuth>
                } />

                {/* Protected Routes */}
                <Route path="/" element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard/ftf-manufacturing" element={<FTFManufacturing />} />
                  <Route path="dashboard/ftf-materials" element={<FTFMaterials />} />
                  <Route path="dashboard/legazpi-storage" element={<LegazpiStorage />} />
                  <Route path="dashboard/:location" element={<LocationDashboard />} />
                  <Route path="stock-in" element={<StockIn />} />
                  <Route path="transfer" element={<TransferLocation />} />
                  <Route path="branch-inventory" element={<BranchInventory />} />
                  <Route path="reseller-order" element={<ResellerOrderRedesigned />} />
                  <Route path="reseller-order/edit/:orderId" element={<ResellerOrderRedesigned />} />
                  <Route path="reseller-orders-list" element={<ResellerOrderList />} />
                  <Route path="order-history" element={<OrderHistory />} />
                  <Route path="reseller-dashboard-final" element={<ResellerDashboard />} />
                  <Route path="sample-computation" element={<SampleComputation />} />
                  <Route path="settings/sku-addition" element={<SettingsSku />} />
                  <Route path="settings/admin-key" element={<AdminKey />} />
                  <Route path="settings/register" element={<RegisterAccount />} />
                </Route>
              </Routes>
            </DomainMiddleware>
          </BrowserRouter>
        </BranchInventoryProvider>
      </InventoryProvider>
    </AuthProvider>
  );
}

export default App;
