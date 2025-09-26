-- Temporarily disable RLS on game_rooms to test if auth context is the issue
ALTER TABLE public.game_rooms DISABLE ROW LEVEL SECURITY;