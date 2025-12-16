// Current Version: 2.1.9
// Last Updated: 2025-12-16
//
// Change Log:
// - 2.1.9: Harden Table Layout with Flexible Box (Fix Scrollbar Missing)
// - 2.1.8: Aggressively Fix Table Scroll (450px clearance)
// - 2.1.7: Fix Scrolling Issue on Pending Orders & Location Dashboard
// - 2.1.6: Fix LocationDashboard Crash (Missing Imports)
// - 2.1.5: Implemented Toast Notifications and Cleaned up Duplicate Code
// - 2.1.4: Stock Reversal: Undo "Completed" Transfer Status
// - 2.1.3: Fix Transfer Deduction (Legazpi & logic)
// - 2.1.2: Add Stock Deduction Logic for Transfers
// - 2.1.1: Fix Branch Transaction Status & Edit Mode
// - 2.1.0: Fix Branch Transaction Logic & Packing List 
// - 2.0.9: Fix Discord Transfer Notifications
// - 2.0.8: Fix Legazpi Storage Sorting (Size-based)
// - 2.0.7: Fix Branch Transactions Table
// - 2.0.6: Enforce "Single Line" Button UI
// - 2.0.5: Standardize Button UI & Alignment
// - 2.0.4: Refine UI aesthetics (Modern Sidebar, Slim Scrollbar)
// - 2.0.3: Fix Encoded Button Reactivity
// - 2.0.2: Refine Email Notifications
// - 2.0.1: Fix Email Delivery Issues
// - 2.0.0: Initial Deployment

export const DEPLOYMENT_VERSION = '2.1.9';
export const DEPLOYMENT_DATE = '2025-12-16';
export const DEPLOYMENT_FEATURES = [
    'Harden Table Layout with Flexible Box', // Added
    'Stock Reversal: Undo "Completed" Transfer Status', // Added
    'Fixed Legazpi Transfer Deduction (SKU/Name Fallback)',
    'Transfer Logic: Deduct Stock AFTER Completion (Fix)',
    'FTF Manufacturing Redesign',
    'Standalone Navigation Position',
    'Settings Modal with 6 Tabs',
    'Stock Adjustment Logging',
    'Export Functionality',
    'Mobile PDF Fix (Download Button)',
    'HTML Order Summary',
    'UI Refinements (Modal & Text)',
    'Modal Table Cleanup (No SKU, Margins)',
    'SKU Text Removed Completely',
    'Brand Color Palette Applied (Cream, Merlot, etc.)',
    'Background Refinement (White Page, Colorful Cards)',
    'Modal Table: Centered Hyphen for Zero Totals',
    'Fixed Order Edit Functionality',
    'Verified Order Delete Functionality',
    'Reseller Summary: YTD Sales Badge'
];
