-- Fix the RLS policy for game_rooms INSERT to allow users to create rooms as hosts
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;

CREATE POLICY "Users can create rooms as hosts" 
ON public.game_rooms 
FOR INSERT 
TO authenticated
WITH CHECK (host_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));