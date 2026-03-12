-- ============================================
-- DELETE ALL DATA FOR AYALA LEGAZPI
-- ============================================

-- Delete inventory data
DELETE FROM branch_inventory 
WHERE branch_location = 'Ayala Legazpi';

-- Delete history
DELETE FROM branch_inventory_history 
WHERE branch_location = 'Ayala Legazpi';

-- Delete import logs
DELETE FROM branch_utak_import_log 
WHERE branch_location = 'Ayala Legazpi';

-- Delete capacity settings
DELETE FROM branch_capacity_settings 
WHERE branch_location = 'Ayala Legazpi';

-- Verify deletion
SELECT 'Remaining inventory count:' as status, COUNT(*) as count 
FROM branch_inventory 
WHERE branch_location = 'Ayala Legazpi';
