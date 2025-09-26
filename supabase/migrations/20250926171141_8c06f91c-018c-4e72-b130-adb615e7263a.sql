-- Re-enable RLS and create a working policy
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can view rooms they're in" ON public.game_rooms;
DROP POLICY IF EXISTS "Hosts can update their rooms" ON public.game_rooms;

-- Create new working policies
CREATE POLICY "Enable insert for authenticated users only" ON public.game_rooms
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.game_rooms
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable update for authenticated users only" ON public.game_rooms
FOR UPDATE TO authenticated  
USING (true)
WITH CHECK (true);