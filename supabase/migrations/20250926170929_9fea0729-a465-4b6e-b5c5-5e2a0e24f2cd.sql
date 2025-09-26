-- Create a more permissive policy for game room creation
DROP POLICY IF EXISTS "Users can create rooms as hosts" ON public.game_rooms;

-- Allow authenticated users to create rooms
CREATE POLICY "Authenticated users can create rooms" 
ON public.game_rooms 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);