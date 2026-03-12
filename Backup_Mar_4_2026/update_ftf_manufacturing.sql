-- Update kikiks_locations table to rename Roro Commissary to FTF Manufacturing

UPDATE kikiks_locations 
SET name = 'FTF Manufacturing' 
WHERE name = 'Roro Commissary';
