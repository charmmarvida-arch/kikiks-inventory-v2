# Backup: Dec 15, 8:30 PM

## State
- **UI Alignment:** "Pending Orders" and "Kikiks Branches" tables have been standardized with fixed height and sticky headers.
- **Scroll Fix:** Table container height set to `calc(100vh - 280px)` to solve the issue where the scrollbar was hidden/cut off.
- **Column Optimization:**
  - **Pending Orders:** Merged Date/Time, renamed Reseller/Packing List headers.
  - **Kikiks Branches:** Removed Category column, shortened View/Edit buttons, renamed headers.
- **Rollback Context:** This version is based on `Backup_Dec_15_630PM` (post-rollback of API changes), with *only* the UI fixes applied on top.

## Key Files Modified
- `src/components/ResellerOrderList.jsx`
- `src/components/LocationDashboard.jsx`
- `VERCEL_TRIGGER.txt`
