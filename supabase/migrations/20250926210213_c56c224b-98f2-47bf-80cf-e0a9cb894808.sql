-- Add card_hash column to bingo_cards table
ALTER TABLE bingo_cards ADD COLUMN IF NOT EXISTS card_hash text;

-- Create unique index to ensure one card per (round, player, card_number)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_per_player_round
ON bingo_cards (round_id, room_player_id, card_number);

-- Create unique index to detect accidental identical boards in a round
CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_hash_per_round
ON bingo_cards (round_id, card_hash);