-- Add unique constraints for bingo cards to ensure no duplicates
-- One card per (round, player, card_number)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_per_player_round
ON bingo_cards (round_id, room_player_id, card_number);

-- Block duplicate content in a round (belt & braces)  
CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_hash_per_round
ON bingo_cards (round_id, card_hash);