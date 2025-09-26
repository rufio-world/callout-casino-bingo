-- Enable realtime for necessary tables
ALTER TABLE game_rooms REPLICA IDENTITY FULL;
ALTER TABLE room_players REPLICA IDENTITY FULL;
ALTER TABLE game_rounds REPLICA IDENTITY FULL;
ALTER TABLE bingo_cards REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_cards;

-- Create edge function to handle game start and number drawing
-- This will be implemented as an edge function for synchronized gameplay