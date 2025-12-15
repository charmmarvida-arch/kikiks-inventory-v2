# Backup: Dec 15, 10:00 PM
**Status:** Stable / Deployed

## Key Changes Included:

### 1. Security Remediation
- **Fixed:** Removed `temp_env.txt` containing leaked Supabase keys.
- **Fixed:** Updated `.gitignore` to strictly exclude `temp_env.txt` and `*.env.txt`.
- **Action:** User rotated Supabase keys and updated Vercel environment variables.

### 2. COA (Certificate of Analysis) UX Improvements
- **Sorted List:** Items in the Create COA modal are now sorted by size (Cups -> Pints -> Liters -> Gallons).
- **Quantity Column:** Added a bold "Qty" column for packers to verify physical counts.
- **Validation:** "Prepared By" is now a mandatory field.
- **Auto-Date:** "Date" is auto-filled to the current date and set to Read-Only.
- **Confirmation:** Added an "Are you sure?" confirmation modal before generating the PDF.

### 3. PDF Pricing Fix
- **Fixed:** The Packing List PDF was previously using global default prices (e.g., 645) instead of Zone-Specific prices (e.g., 680).
- **Solution:** Updated `ResellerOrderRedesigned.jsx` and `ResellerOrderList.jsx` to correctly resolve and pass the exact Zone Prices to the PDF generator.

### 4. Table Layout Fixes
- **Fixed:** Cut-off columns in "Pending Orders" and "Kikiks Branches" tables.
- **Solution:** Reduced horizontal padding in `.inventory-table`.
