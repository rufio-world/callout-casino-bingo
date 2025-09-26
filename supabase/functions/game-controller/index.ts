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

// Generate bingo cards with proper column structure and better randomness
const generateBingoCard = (freeCenter: boolean = true, seed?: string): number[] => {
  const card: number[] = [];
  
  // Add entropy by using current time and optional seed
  const entropy = Date.now() + Math.random() * 1000000 + (seed ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0);
  Math.random = (() => {
    let x = Math.sin(entropy) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  })();
  
  // B column: 1-15 (5 numbers)
  const bNumbers = generateUniqueNumbers(1, 15, 5);
  card.push(...bNumbers);
  
  // I column: 16-30 (5 numbers)  
  const iNumbers = generateUniqueNumbers(16, 30, 5);
  card.push(...iNumbers);
  
  // N column: 31-45 (4 or 5 numbers depending on free center)
  const nNumbers = generateUniqueNumbers(31, 45, freeCenter ? 4 : 5);
  if (freeCenter) {
    nNumbers.splice(2, 0, 0); // Insert FREE at position 2
  }
  card.push(...nNumbers);
  
  // G column: 46-60 (5 numbers)
  const gNumbers = generateUniqueNumbers(46, 60, 5);
  card.push(...gNumbers);
  
  // O column: 61-75 (5 numbers)
  const oNumbers = generateUniqueNumbers(61, 75, 5);
  card.push(...oNumbers);
  
  // Reset Math.random to default
  Math.random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295;
  
  return card;
};

const generateUniqueNumbers = (min: number, max: number, count: number): number[] => {
  const numbers: number[] = [];
  const available: number[] = [];
  
  for (let i = min; i <= max; i++) {
    available.push(i);
  }
  
  // Use crypto-secure randomness for better uniqueness
  for (let i = 0; i < count; i++) {
    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    const randomIndex = Math.floor((randomBytes[0] / 4294967295) * available.length);
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
        // Shuffle players to ensure card generation order doesn't affect uniqueness
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        
        for (let playerIndex = 0; playerIndex < shuffledPlayers.length; playerIndex++) {
          const player = shuffledPlayers[playerIndex];
          
          for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
            // Create unique seed for each card to ensure different numbers
            const uniqueSeed = `${player.id}-${cardNum}-${Date.now()}-${Math.random()}`;
            const cardNumbers = generateBingoCard(room.free_center, uniqueSeed);
            
            // Add small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 1));
            
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
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        
        for (let playerIndex = 0; playerIndex < shuffledPlayers.length; playerIndex++) {
          const player = shuffledPlayers[playerIndex];
          
          for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
            const uniqueSeed = `${player.id}-${cardNum}-${Date.now()}-${Math.random()}`;
            const cardNumbers = generateBingoCard(room.free_center, uniqueSeed);
            
            await new Promise(resolve => setTimeout(resolve, 1));
            
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
    const maxNumbers = Math.floor(240 / 4); // 60 numbers max in 4 minutes
    
    console.log(`Round timing - elapsed: ${elapsed}s, numbers drawn: ${round.current_draw_index}/${maxNumbers}, max time: 240s`);
    
    // End round if we've reached time limit OR drawn maximum numbers
    if (elapsed >= 240 || round.current_draw_index >= maxNumbers) {
      await supabaseClient
        .from('game_rounds')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', roundId);
      
      console.log(`Round completed - Time: ${elapsed}s, Numbers: ${round.current_draw_index}`);
      return;
    }

    // Ensure we don't exceed our draw sequence length
    if (round.current_draw_index >= round.draw_sequence.length) {
      console.log('All numbers drawn from sequence');
      await supabaseClient
        .from('game_rounds')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', roundId);
      return;
    }

    // Draw next number
    const nextIndex = round.current_draw_index;
    const drawnNumber = round.draw_sequence[nextIndex];
    
    await supabaseClient
      .from('game_rounds')
      .update({ current_draw_index: nextIndex + 1 })
      .eq('id', roundId);

    console.log(`Drew number ${nextIndex + 1}/${maxNumbers}: ${drawnNumber} at ${elapsed.toFixed(1)}s`);

    // Schedule next number draw in 4 seconds, but check if we have time left
    const timeForNextDraw = elapsed + 4;
    if (timeForNextDraw < 240 && nextIndex + 1 < maxNumbers) {
      setTimeout(() => drawNumber(supabaseClient, roundId), 4000);
    } else {
      // This will be the last number or we're near the end
      const remainingTime = Math.max(0, 240 - elapsed);
      setTimeout(async () => {
        // Final check and end round
        try {
          await supabaseClient
            .from('game_rounds')
            .update({ 
              status: 'completed',
              end_time: new Date().toISOString()
            })
            .eq('id', roundId);
          console.log('Round completed - time limit reached');
        } catch (error) {
          console.error('Error completing round:', error);
        }
      }, Math.max(0, remainingTime * 1000)); // Wait until exactly 4 minutes
    }

  } catch (error) {
    console.error('Error drawing number:', error);
  }
}