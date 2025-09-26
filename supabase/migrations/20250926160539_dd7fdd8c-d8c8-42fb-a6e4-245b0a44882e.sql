-- Create enum types for the bingo game
CREATE TYPE game_status AS ENUM ('waiting', 'in_progress', 'finished');
CREATE TYPE player_role AS ENUM ('host', 'player');

-- Profiles table for user accounts and avatars
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_name TEXT DEFAULT 'default-avatar',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Game rooms table
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status game_status DEFAULT 'waiting',
  max_players INTEGER DEFAULT 10,
  rounds_total INTEGER DEFAULT 5,
  rounds_completed INTEGER DEFAULT 0,
  cards_per_player INTEGER DEFAULT 1,
  free_center BOOLEAN DEFAULT TRUE,
  current_round_number INTEGER DEFAULT 0,
  round_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT room_code_format CHECK (room_code ~ '^[A-Z0-9]{5}$'),
  CONSTRAINT valid_rounds CHECK (rounds_total >= 3 AND rounds_total <= 10),
  CONSTRAINT valid_cards CHECK (cards_per_player >= 1 AND cards_per_player <= 4),
  CONSTRAINT valid_max_players CHECK (max_players >= 2 AND max_players <= 10)
);

-- Players in rooms (including anonymous players)
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NULL,
  player_name TEXT NOT NULL,
  avatar_name TEXT DEFAULT 'default-avatar',
  role player_role DEFAULT 'player',
  total_score INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_id, profile_id),
  CONSTRAINT player_name_length CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 30)
);

-- Game rounds
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  draw_sequence INTEGER[] DEFAULT '{}',
  current_draw_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  
  UNIQUE(room_id, round_number),
  CONSTRAINT valid_round_number CHECK (round_number >= 1)
);

-- Bingo cards for each player in each round
CREATE TABLE bingo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_player_id UUID REFERENCES room_players(id) ON DELETE CASCADE,
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL DEFAULT 1,
  numbers INTEGER[25] NOT NULL,
  marked_positions BOOLEAN[25] DEFAULT ARRAY[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],
  is_winner BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_player_id, round_id, card_number),
  CONSTRAINT valid_card_number CHECK (card_number >= 1 AND card_number <= 4),
  CONSTRAINT valid_numbers_array CHECK (array_length(numbers, 1) = 25),
  CONSTRAINT valid_marked_array CHECK (array_length(marked_positions, 1) = 25)
);

-- Player scores per round
CREATE TABLE round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_player_id UUID REFERENCES room_players(id) ON DELETE CASCADE,
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  lines_completed INTEGER DEFAULT 0,
  bingo_achieved BOOLEAN DEFAULT FALSE,
  corners_bonus BOOLEAN DEFAULT FALSE,
  multi_card_bonus INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(room_player_id, round_id)
);

-- Match history for profiles
CREATE TABLE match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  final_placement INTEGER,
  total_points INTEGER DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for game rooms
CREATE POLICY "Anyone can view rooms they're in" ON game_rooms FOR SELECT USING (
  id IN (SELECT room_id FROM room_players WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Authenticated users can create rooms" ON game_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Hosts can update their rooms" ON game_rooms FOR UPDATE USING (
  host_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- RLS Policies for room players
CREATE POLICY "Players can view others in same room" ON room_players FOR SELECT USING (
  room_id IN (SELECT room_id FROM room_players WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Anyone can join rooms" ON room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update their own data" ON room_players FOR UPDATE USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  room_id IN (SELECT id FROM game_rooms WHERE host_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- RLS Policies for other tables (allow room members to access)
CREATE POLICY "Room members can view rounds" ON game_rounds FOR SELECT USING (
  room_id IN (SELECT room_id FROM room_players WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "System can create rounds" ON game_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update rounds" ON game_rounds FOR UPDATE USING (true);

CREATE POLICY "Room members can view cards" ON bingo_cards FOR SELECT USING (
  room_player_id IN (SELECT id FROM room_players WHERE room_id IN (
    SELECT room_id FROM room_players WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ))
);
CREATE POLICY "System can create cards" ON bingo_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update their own cards" ON bingo_cards FOR UPDATE USING (
  room_player_id IN (SELECT id FROM room_players WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Room members can view scores" ON round_scores FOR SELECT USING (
  room_player_id IN (SELECT id FROM room_players WHERE room_id IN (
    SELECT room_id FROM room_players WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ))
);
CREATE POLICY "System can manage scores" ON round_scores FOR ALL WITH CHECK (true);

CREATE POLICY "Users can view their match history" ON match_history FOR SELECT USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "System can create match history" ON match_history FOR INSERT WITH CHECK (true);

-- Functions for timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON game_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Check if code already exists, if so generate a new one
  WHILE EXISTS(SELECT 1 FROM game_rooms WHERE room_code = result) LOOP
    result := '';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;