-- Add visual hints setting to game rooms
ALTER TABLE public.game_rooms 
ADD COLUMN visual_hints BOOLEAN DEFAULT true;