-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create a function to check if user is member of a room (breaks recursion)
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_players rp
    INNER JOIN profiles p ON rp.profile_id = p.id
    WHERE p.user_id = _user_id 
    AND rp.room_id = _room_id
  )
$$;

-- Create function to get user's rooms (breaks recursion)
CREATE OR REPLACE FUNCTION public.get_user_rooms(_user_id uuid)
RETURNS TABLE(room_id uuid)
LANGUAGE sql
STABLE  
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rp.room_id
  FROM room_players rp
  INNER JOIN profiles p ON rp.profile_id = p.id  
  WHERE p.user_id = _user_id
$$;

-- Drop and recreate the problematic policies with security definer functions

-- Fix room_players policies
DROP POLICY IF EXISTS "Players can view others in same room" ON room_players;
CREATE POLICY "Players can view others in same room" 
ON room_players 
FOR SELECT 
USING (public.is_room_member(auth.uid(), room_id));

-- Fix game_rooms policies  
DROP POLICY IF EXISTS "Anyone can view rooms they're in" ON game_rooms;
CREATE POLICY "Anyone can view rooms they're in"
ON game_rooms
FOR SELECT
USING (id IN (SELECT room_id FROM public.get_user_rooms(auth.uid())));

-- Fix game_rounds policies
DROP POLICY IF EXISTS "Room members can view rounds" ON game_rounds;
CREATE POLICY "Room members can view rounds"
ON game_rounds  
FOR SELECT
USING (public.is_room_member(auth.uid(), room_id));

-- Fix bingo_cards policies
DROP POLICY IF EXISTS "Room members can view cards" ON bingo_cards;
CREATE POLICY "Room members can view cards"
ON bingo_cards
FOR SELECT  
USING (room_player_id IN (
  SELECT rp.id 
  FROM room_players rp
  WHERE public.is_room_member(auth.uid(), rp.room_id)
));

-- Fix round_scores policies
DROP POLICY IF EXISTS "Room members can view scores" ON round_scores;  
CREATE POLICY "Room members can view scores"
ON round_scores
FOR SELECT
USING (room_player_id IN (
  SELECT rp.id
  FROM room_players rp  
  WHERE public.is_room_member(auth.uid(), rp.room_id)
));