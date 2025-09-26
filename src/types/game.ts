// TypeScript types for the Bingo game

export type GameStatus = 'waiting' | 'in_progress' | 'finished';
export type PlayerRole = 'host' | 'player';

export interface Profile {
  id: string;
  user_id?: string;
  username: string;
  avatar_name: string;
  created_at: string;
  updated_at: string;
}

export interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  status: GameStatus;
  max_players: number;
  rounds_total: number;
  rounds_completed: number;
  cards_per_player: number;
  free_center: boolean;
  current_round_number: number;
  round_start_time?: string;
  created_at: string;
  updated_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  profile_id?: string;
  player_name: string;
  avatar_name: string;
  role: PlayerRole;
  total_score: number;
  is_anonymous: boolean;
  joined_at: string;
}

export interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  start_time: string;
  end_time?: string;
  draw_sequence: number[];
  current_draw_index: number;
  status: string;
}

export interface BingoCard {
  id: string;
  room_player_id: string;
  round_id: string;
  card_number: number;
  numbers: number[];
  marked_positions: boolean[];
  is_winner: boolean;
  points_earned: number;
  created_at: string;
}

export interface RoundScore {
  id: string;
  room_player_id: string;
  round_id: string;
  points_earned: number;
  lines_completed: number;
  bingo_achieved: boolean;
  corners_bonus: boolean;
  multi_card_bonus: number;
  created_at: string;
}

export interface Avatar {
  name: string;
  image: string;
  category: 'Animals' | 'People' | 'Objects' | 'Mythical';
}

export interface DrawnNumber {
  number: number;
  timestamp: number;
  announced: boolean;
}

export interface AudioSettings {
  enabled: boolean;
  volume: number;
  voice: string;
  language: string;
}