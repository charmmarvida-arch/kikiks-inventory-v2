## Run Database Migration

You need to run the SQL migration to add the `has_packing_list` column to the `transfer_orders` table.

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `add_has_packing_list_to_transfer_orders.sql`
4. Paste and execute the SQL

### Option 2: Via Supabase CLI (if installed)
```bash
supabase db push
```

Or run the migration file directly:
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f add_has_packing_list_to_transfer_orders.sql
```

Once the migration is complete, the application will be ready to use all the new features!
