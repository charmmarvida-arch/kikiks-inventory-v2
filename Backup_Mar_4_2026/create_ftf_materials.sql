-- Create table for FTF Materials (Raw Materials, Packaging, Stickers)
CREATE TABLE IF NOT EXISTS public.ftf_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Raw Materials', 'Packaging', 'Stickers')),
    uom TEXT NOT NULL,
    current_stock NUMERIC DEFAULT 0,
    min_threshold NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ftf_materials ENABLE ROW LEVEL SECURITY;

-- Create policies (Adjust based on your auth requirements, defaulting to public/authenticated access)
CREATE POLICY "Enable read access for all users" ON public.ftf_materials
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.ftf_materials
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.ftf_materials
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.ftf_materials
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant access
GRANT ALL ON public.ftf_materials TO authenticated;
GRANT SELECT ON public.ftf_materials TO anon;
