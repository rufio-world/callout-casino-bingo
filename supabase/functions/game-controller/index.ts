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

// Generate bingo cards with proper column structure and cryptographically secure randomness
const generateBingoCard = (freeCenter: boolean = true, playerIndex: number = 0, cardNumber: number = 1): number[] => {
  // Initialize 5x5 grid (25 positions)
  const card: number[] = new Array(25);
  
  // Use crypto.getRandomValues for true randomness
  const getSecureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295;
  
  // Add additional entropy based on player and card to ensure uniqueness
  const entropy = Date.now() + playerIndex * 1000 + cardNumber * 100 + Math.floor(getSecureRandom() * 1000000);
  
  // B column: 1-15 (positions 0, 5, 10, 15, 20)
  const bNumbers = generateUniqueNumbers(1, 15, 5, entropy + 1);
  card[0] = bNumbers[0];
  card[5] = bNumbers[1];
  card[10] = bNumbers[2];
  card[15] = bNumbers[3];
  card[20] = bNumbers[4];
  
  // I column: 16-30 (positions 1, 6, 11, 16, 21)
  const iNumbers = generateUniqueNumbers(16, 30, 5, entropy + 2);
  card[1] = iNumbers[0];
  card[6] = iNumbers[1];
  card[11] = iNumbers[2];
  card[16] = iNumbers[3];
  card[21] = iNumbers[4];
  
  // N column: 31-45 (positions 2, 7, 12, 17, 22) - position 12 is center
  const nNumbers = generateUniqueNumbers(31, 45, freeCenter ? 4 : 5, entropy + 3);
  card[2] = nNumbers[0];
  card[7] = nNumbers[1];
  card[12] = freeCenter ? 0 : nNumbers[2]; // FREE space or regular number
  card[17] = freeCenter ? nNumbers[2] : nNumbers[3];
  card[22] = freeCenter ? nNumbers[3] : nNumbers[4];
  
  // G column: 46-60 (positions 3, 8, 13, 18, 23)
  const gNumbers = generateUniqueNumbers(46, 60, 5, entropy + 4);
  card[3] = gNumbers[0];
  card[8] = gNumbers[1];
  card[13] = gNumbers[2];
  card[18] = gNumbers[3];
  card[23] = gNumbers[4];
  
  // O column: 61-75 (positions 4, 9, 14, 19, 24)
  const oNumbers = generateUniqueNumbers(61, 75, 5, entropy + 5);
  card[4] = oNumbers[0];
  card[9] = oNumbers[1];
  card[14] = oNumbers[2];
  card[19] = oNumbers[3];
  card[24] = oNumbers[4];
  
  return card;
};

const generateUniqueNumbers = (min: number, max: number, count: number, entropy: number = 0): number[] => {
  const numbers: number[] = [];
  const available: number[] = [];
  
  for (let i = min; i <= max; i++) {
    available.push(i);
  }
  
  // Use crypto-secure randomness with entropy for better uniqueness
  for (let i = 0; i < count; i++) {
    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    // Add entropy to the random calculation to ensure different results per player/card
    const randomIndex = Math.floor(((randomBytes[0] / 4294967295) + (entropy / 1000000)) % 1 * available.length);
    numbers.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  return numbers.sort((a, b) => a - b);
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

      // Create bingo cards for all players with unique seeds
      const { data: players } = await supabaseClient
        .from('room_players')
        .select('*')
        .eq('room_id', room.id);

      if (players) {
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
          const player = players[playerIndex];
          
          for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
            // Use unique player ID hash and timestamp for maximum uniqueness
            const playerSeed = player.id.split('-').join('').slice(0, 8);
            const uniqueSeed = parseInt(playerSeed, 16) + playerIndex * 10000 + cardNum * 1000 + Date.now();
            const cardNumbers = generateBingoCard(room.free_center, uniqueSeed, cardNum);
            
            // Add small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 2));
            
            await supabaseClient
              .from('bingo_cards')
              .insert({
                room_player_id: player.id,
                round_id: round.id,
                card_number: cardNum,
                numbers: cardNumbers,
                marked_positions: Array(25).fill(false),
                is_winner: false,
                points_earned: 0
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

      // Create new bingo cards for all players
      const { data: players } = await supabaseClient
        .from('room_players')
        .select('*')
        .eq('room_id', room.id);

      if (players) {
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
          const player = players[playerIndex];
          
          for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
            // Use unique player ID hash and timestamp for maximum uniqueness
            const playerSeed = player.id.split('-').join('').slice(0, 8);
            const uniqueSeed = parseInt(playerSeed, 16) + playerIndex * 10000 + cardNum * 1000 + Date.now();
            const cardNumbers = generateBingoCard(room.free_center, uniqueSeed, cardNum);
            
            await new Promise(resolve => setTimeout(resolve, 2));
            
            await supabaseClient
              .from('bingo_cards')
              .insert({
                room_player_id: player.id,
                round_id: newRound.id,
                card_number: cardNum,
                numbers: cardNumbers,
                marked_positions: Array(25).fill(false),
                is_winner: false,
                points_earned: 0
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