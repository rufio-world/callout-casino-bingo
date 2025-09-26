import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  start_time: string;
  end_time?: string;
  draw_sequence: number[];
  current_draw_index: number;
  status: string;
}

// --- Deterministic seed helpers --------------------------------------------
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromHex(hex: string): number {
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleColumn(min: number, max: number, k: number, rnd: () => number): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) pool.push(n);
  shuffle(pool, rnd);
  return pool.slice(0, k).sort((a, b) => a - b);
}

// --- Deterministic 5x5 bingo card (US 75-ball) ------------------------------
async function generateBingoCardDeterministic({
  roomId,
  roundId,
  playerId,
  cardNumber,
  freeCenter = true,
}: {
  roomId: string;
  roundId: string;
  playerId: string;
  cardNumber: number;
  freeCenter?: boolean;
}): Promise<number[]> {
  const seedString = `${roomId}:${roundId}:${playerId}:card${cardNumber}:free${freeCenter ? 1 : 0}`;
  const hex = await sha256Hex(seedString);
  const rnd = mulberry32(seedFromHex(hex));

  const c = new Array<number>(25);

  const b = sampleColumn(1, 15, 5, rnd);
  c[0] = b[0]; c[5] = b[1]; c[10] = b[2]; c[15] = b[3]; c[20] = b[4];

  const i = sampleColumn(16, 30, 5, rnd);
  c[1] = i[0]; c[6] = i[1]; c[11] = i[2]; c[16] = i[3]; c[21] = i[4];

  const nCount = freeCenter ? 4 : 5;
  const n = sampleColumn(31, 45, nCount, rnd);
  c[2] = n[0];
  c[7] = n[1];
  c[12] = freeCenter ? 0 : n[2];
  c[17] = freeCenter ? n[2] : n[3];
  c[22] = freeCenter ? n[3] : n[4];

  const g = sampleColumn(46, 60, 5, rnd);
  c[3] = g[0]; c[8] = g[1]; c[13] = g[2]; c[18] = g[3]; c[23] = g[4];

  const o = sampleColumn(61, 75, 5, rnd);
  c[4] = o[0]; c[9] = o[1]; c[14] = o[2]; c[19] = o[3]; c[24] = o[4];

  return c;
}

// Generate bingo numbers with proper column validation
const generateDrawSequence = (): number[] => {
  const numbers: number[] = [];
  
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  for (let i = 1; i <= 75; i++) {
    numbers.push(i);
  }
  
  // Shuffle using Fisher-Yates algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  return numbers;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, roomCode } = await req.json();
    console.log('Game controller action:', action, 'for room:', roomCode);

    if (action === 'start_game') {
      // Start a new game
      const { data: room, error: roomError } = await supabaseClient
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError) {
        throw new Error(`Room not found: ${roomError.message}`);
      }

      // Clean up any existing rounds and cards for this room
      const { data: playerIds } = await supabaseClient
        .from('room_players')
        .select('id')
        .eq('room_id', room.id);

      if (playerIds && playerIds.length > 0) {
        await supabaseClient
          .from('bingo_cards')
          .delete()
          .in('room_player_id', playerIds.map(p => p.id));
      }

      await supabaseClient
        .from('game_rounds')
        .delete()
        .eq('room_id', room.id);

      // Update room status
      await supabaseClient
        .from('game_rooms')
        .update({ 
          status: 'in_progress',
          current_round_number: 1,
          round_start_time: new Date().toISOString()
        })
        .eq('id', room.id);

      // Create first round
      const drawSequence = generateDrawSequence();
      const { data: round, error: roundError } = await supabaseClient
        .from('game_rounds')
        .insert({
          room_id: room.id,
          round_number: 1,
          start_time: new Date().toISOString(),
          draw_sequence: drawSequence,
          current_draw_index: 0,
          status: 'active'
        })
        .select()
        .single();

      if (roundError) {
        throw new Error(`Failed to create round: ${roundError.message}`);
      }

      // Create bingo cards for all players with deterministic generation
      const { data: players } = await supabaseClient
        .from('room_players')
        .select('*')
        .eq('room_id', room.id);

      if (players) {
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
          const player = players[playerIndex];
          
          for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
            const cardNumbers = await generateBingoCardDeterministic({
              roomId: room.id,
              roundId: round.id,
              playerId: player.id,
              cardNumber: cardNum,
              freeCenter: room.free_center,
            });
            
            const cardHash = await sha256Hex(cardNumbers.join(','));
            
            await supabaseClient
              .from('bingo_cards')
              .insert({
                room_player_id: player.id,
                round_id: round.id,
                card_number: cardNum,
                numbers: cardNumbers,
                marked_positions: Array(25).fill(false),
                is_winner: false,
                points_earned: 0,
                card_hash: cardHash
              });
          }
        }
      }

      // Start the number drawing timer
      setTimeout(() => drawNumber(supabaseClient, round.id), 4000);

      return new Response(JSON.stringify({ success: true, round }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'start_next_round') {
      // Start the next round
      const { data: room, error: roomError } = await supabaseClient
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError) {
        throw new Error(`Room not found: ${roomError.message}`);
      }

      const nextRoundNumber = room.current_round_number + 1;
      
      if (nextRoundNumber > room.rounds_total) {
        // Game is complete
        await supabaseClient
          .from('game_rooms')
          .update({ status: 'finished' })
          .eq('id', room.id);
          
        return new Response(JSON.stringify({ success: true, gameComplete: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update room for next round
      await supabaseClient
        .from('game_rooms')
        .update({ 
          current_round_number: nextRoundNumber,
          round_start_time: new Date().toISOString()
        })
        .eq('id', room.id);

      // Create next round
      const drawSequence = generateDrawSequence();
      const { data: newRound, error: newRoundError } = await supabaseClient
        .from('game_rounds')
        .insert({
          room_id: room.id,
          round_number: nextRoundNumber,
          start_time: new Date().toISOString(),
          draw_sequence: drawSequence,
          current_draw_index: 0,
          status: 'active'
        })
        .select()
        .single();

      if (newRoundError) {
        throw new Error(`Failed to create next round: ${newRoundError.message}`);
      }

      // Create new bingo cards for all players with deterministic generation
      const { data: players } = await supabaseClient
        .from('room_players')
        .select('*')
        .eq('room_id', room.id);

      if (players) {
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
          const player = players[playerIndex];
          
          for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
            const cardNumbers = await generateBingoCardDeterministic({
              roomId: room.id,
              roundId: newRound.id,
              playerId: player.id,
              cardNumber: cardNum,
              freeCenter: room.free_center,
            });
            
            const cardHash = await sha256Hex(cardNumbers.join(','));
            
            await supabaseClient
              .from('bingo_cards')
              .insert({
                room_player_id: player.id,
                round_id: newRound.id,
                card_number: cardNum,
                numbers: cardNumbers,
                marked_positions: Array(25).fill(false),
                is_winner: false,
                points_earned: 0,
                card_hash: cardHash
              });
          }
        }
      }

      // Start the number drawing timer
      setTimeout(() => drawNumber(supabaseClient, newRound.id), 4000);

      return new Response(JSON.stringify({ success: true, round: newRound }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Game controller error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function drawNumber(supabaseClient: any, roundId: string) {
  try {
    // Get current round state
    const { data: round, error: roundError } = await supabaseClient
      .from('game_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (roundError || !round || round.status !== 'active') {
      console.log('Round ended or not found');
      return;
    }

    // Check timing - 240 seconds total, new number every 4 seconds = max 60 numbers
    const startTime = new Date(round.start_time).getTime();
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    const maxNumbers = 60; // Exactly 60 numbers in 4 minutes (240 seconds / 4 seconds per number)
    
    console.log(`Round timing - elapsed: ${elapsed}s, numbers drawn: ${round.current_draw_index}/${maxNumbers}, max time: 240s`);
    
    // End round if we've reached the time limit
    if (elapsed >= 240) {
      await supabaseClient
        .from('game_rounds')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', roundId);
      
      console.log(`Round completed - Time limit reached: ${elapsed}s, Numbers drawn: ${round.current_draw_index}`);
      return;
    }

    // Draw next number if we haven't reached the maximum and have numbers left in sequence
    if (round.current_draw_index < maxNumbers && round.current_draw_index < round.draw_sequence.length) {
      const nextIndex = round.current_draw_index;
      const drawnNumber = round.draw_sequence[nextIndex];
      
      await supabaseClient
        .from('game_rounds')
        .update({ current_draw_index: nextIndex + 1 })
        .eq('id', roundId);

      console.log(`Drew number ${nextIndex + 1}/${maxNumbers}: ${drawnNumber} at ${elapsed.toFixed(1)}s`);
    }

    // Schedule next draw in exactly 4 seconds
    setTimeout(() => drawNumber(supabaseClient, roundId), 4000);

  } catch (error) {
    console.error('Error drawing number:', error);
  }
}