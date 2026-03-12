-- ============================================
-- UNDO Branch Inventory Import
-- This will remove imported data from the database
-- ============================================

-- OPTION 1: Delete the MOST RECENT import for a specific branch
-- Replace 'SM Sorsogon' with your branch name if different

-- Step 1: Find the most recent import
SELECT * FROM branch_utak_import_log 
WHERE branch_location = 'SM Sorsogon'  -- Change this to your branch
ORDER BY import_date DESC 
LIMIT 1;

-- Step 2: Delete inventory data from the most recent import
-- (This deletes all products imported since the last import)
DELETE FROM branch_inventory
WHERE branch_location = 'SM Sorsogon'  -- Change this to your branch
  AND last_sync_source = 'utak_import'
  AND last_sync_date >= (
    SELECT import_date 
    FROM branch_utak_import_log 
    WHERE branch_location = 'SM Sorsogon'  -- Change this to your branch
    ORDER BY import_date DESC 
    LIMIT 1
  );

-- Step 3: Delete the import history entries
DELETE FROM branch_inventory_history
WHERE branch_location = 'SM Sorsogon'  -- Change this to your branch
  AND change_type = 'utak_import'
  AND created_at >= (
    SELECT import_date 
    FROM branch_utak_import_log 
    WHERE branch_location = 'SM Sorsogon'  -- Change this to your branch
    ORDER BY import_date DESC 
    LIMIT 1
  );

-- Step 4: Delete the import log entry
DELETE FROM branch_utak_import_log
WHERE id = (
  SELECT id FROM branch_utak_import_log 
  WHERE branch_location = 'SM Sorsogon'  -- Change this to your branch
  ORDER BY import_date DESC 
  LIMIT 1
);


-- ============================================
-- OPTION 2: Delete ALL data for a specific branch
-- Use this if you want to completely clear a branch's inventory
-- ============================================

-- Uncomment the lines below to use this option:

-- DELETE FROM branch_inventory WHERE branch_location = 'SM Sorsogon';
-- DELETE FROM branch_inventory_history WHERE branch_location = 'SM Sorsogon';
-- DELETE FROM branch_utak_import_log WHERE branch_location = 'SM Sorsogon';
-- DELETE FROM branch_capacity_settings WHERE branch_location = 'SM Sorsogon';


-- ============================================
-- OPTION 3: Delete EVERYTHING from all branches
-- Use this to completely reset the branch inventory system
-- ============================================

-- Uncomment the lines below to use this option:

-- DELETE FROM branch_inventory;
-- DELETE FROM branch_inventory_history;
-- DELETE FROM branch_utak_import_log;
-- DELETE FROM branch_capacity_settings;


-- ============================================
-- VERIFY: Check what data remains
-- ============================================

-- Check remaining inventory
SELECT branch_location, COUNT(*) as product_count 
FROM branch_inventory 
GROUP BY branch_location;

-- Check import logs
SELECT branch_location, import_date, products_imported 
FROM branch_utak_import_log 
ORDER BY import_date DESC;
