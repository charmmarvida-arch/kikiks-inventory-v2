-- Add email column to resellers table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'email') THEN
        ALTER TABLE "resellers" ADD COLUMN "email" text;
    END IF;
END $$;
