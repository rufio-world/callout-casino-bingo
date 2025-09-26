import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a complete draw sequence for a bingo round with proper column validation
const generateDrawSequence = (): number[] => {
  const numbers: number[] = [];
  
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  for (let i = 1; i <= 75; i++) {
    numbers.push(i);
  }
  
  // Shuffle the array using Fisher-Yates algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  return numbers;
};

// Generate a single bingo card with proper column numbers
const generateBingoCard = (freeCenter: boolean = true): number[] => {
  const card: number[] = [];
  
  // B column: 1-15 (5 numbers)
  const bNumbers = generateUniqueNumbers(1, 15, 5);
  card.push(...bNumbers);
  
  // I column: 16-30 (5 numbers)  
  const iNumbers = generateUniqueNumbers(16, 30, 5);
  card.push(...iNumbers);
  
  // N column: 31-45 (4 or 5 numbers depending on free center)
  const nNumbers = generateUniqueNumbers(31, 45, freeCenter ? 4 : 5);
  if (freeCenter) {
    // Insert 0 at position 2 (middle of N column)
    nNumbers.splice(2, 0, 0); // 0 represents FREE space
  }
  card.push(...nNumbers);
  
  // G column: 46-60 (5 numbers)
  const gNumbers = generateUniqueNumbers(46, 60, 5);
  card.push(...gNumbers);
  
  // O column: 61-75 (5 numbers)
  const oNumbers = generateUniqueNumbers(61, 75, 5);
  card.push(...oNumbers);
  
  return card;
};

// Generate unique random numbers within a range
const generateUniqueNumbers = (min: number, max: number, count: number): number[] => {
  const numbers: number[] = [];
  const available: number[] = [];
  
  for (let i = min; i <= max; i++) {
    available.push(i);
  }
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    numbers.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  return numbers.sort((a, b) => a - b);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, roomId, roomCode } = await req.json();
    console.log('Game manager action:', action, { roomId, roomCode });

    switch (action) {
      case 'start_game':
        return await startGame(supabase, roomId);
      case 'draw_number':
        return await drawNextNumber(supabase, roomId);
      case 'end_round':
        return await endCurrentRound(supabase, roomId);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Game manager error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startGame(supabase: any, roomId: string) {
  console.log('Starting game for room:', roomId);
  
  // Get room data
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (roomError) {
    throw new Error('Room not found');
  }
  
  // Create new round
  const drawSequence = generateDrawSequence();
  const { data: round, error: roundError } = await supabase
    .from('game_rounds')
    .insert({
      room_id: roomId,
      round_number: room.current_round_number + 1,
      draw_sequence: drawSequence,
      current_draw_index: 0,
      status: 'active'
    })
    .select()
    .single();
  
  if (roundError) {
    console.error('Round creation error:', roundError);
    throw new Error('Failed to create round');
  }
  
  // Get all players in the room
  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId);
  
  if (playersError) {
    throw new Error('Failed to get players');
  }
  
  // Create bingo cards for each player
  const cardsToCreate = [];
  for (const player of players) {
    for (let cardNum = 1; cardNum <= room.cards_per_player; cardNum++) {
      const cardNumbers = generateBingoCard(room.free_center);
      cardsToCreate.push({
        room_player_id: player.id,
        round_id: round.id,
        card_number: cardNum,
        numbers: cardNumbers,
        marked_positions: Array(25).fill(false)
      });
    }
  }
  
  const { error: cardsError } = await supabase
    .from('bingo_cards')
    .insert(cardsToCreate);
  
  if (cardsError) {
    console.error('Cards creation error:', cardsError);
    throw new Error('Failed to create bingo cards');
  }
  
  // Update room status
  const { error: updateError } = await supabase
    .from('game_rooms')
    .update({ 
      status: 'in_progress',
      current_round_number: round.round_number,
      round_start_time: new Date().toISOString()
    })
    .eq('id', roomId);
  
  if (updateError) {
    throw new Error('Failed to update room status');
  }
  
  // Start automatic number drawing
  setTimeout(() => drawNumbersAutomatically(supabase, roomId, round.id), 4000);
  
  console.log('Game started successfully');
  return new Response(JSON.stringify({ success: true, roundId: round.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function drawNextNumber(supabase: any, roomId: string) {
  console.log('Drawing next number for room:', roomId);
  
  const { data: round, error: roundError } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'active')
    .single();
  
  if (roundError || !round) {
    throw new Error('No active round found');
  }
  
  const nextIndex = round.current_draw_index;
  
  if (nextIndex >= round.draw_sequence.length) {
    // End of sequence, end round
    await endCurrentRound(supabase, roomId);
    return new Response(JSON.stringify({ gameComplete: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const drawnNumber = round.draw_sequence[nextIndex];
  
  // Update round with new draw index
  const { error: updateError } = await supabase
    .from('game_rounds')
    .update({ current_draw_index: nextIndex + 1 })
    .eq('id', round.id);
  
  if (updateError) {
    console.error('Failed to update draw index:', updateError);
    throw new Error('Failed to update draw index');
  }
  
  console.log('Drew number:', drawnNumber);
  return new Response(JSON.stringify({ 
    success: true, 
    number: drawnNumber, 
    drawIndex: nextIndex + 1 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function endCurrentRound(supabase: any, roomId: string) {
  console.log('Ending round for room:', roomId);
  
  // Update round status to completed
  const { error: roundError } = await supabase
    .from('game_rounds')
    .update({ 
      status: 'completed',
      end_time: new Date().toISOString()
    })
    .eq('room_id', roomId)
    .eq('status', 'active');
  
  if (roundError) {
    console.error('Failed to end round:', roundError);
  }
  
  // Check if game is complete
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  
  if (!roomError && room && room.current_round_number >= room.rounds_total) {
    // Game complete
    await supabase
      .from('game_rooms')
      .update({ status: 'finished' })
      .eq('id', roomId);
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function drawNumbersAutomatically(supabase: any, roomId: string, roundId: string) {
  try {
    // Check if round is still active
    const { data: round, error } = await supabase
      .from('game_rounds')
      .select('status')
      .eq('id', roundId)
      .single();
    
    if (error || !round || round.status !== 'active') {
      console.log('Round no longer active, stopping number drawing');
      return;
    }
    
    // Draw next number
    await drawNextNumber(supabase, roomId);
    
    // Schedule next number draw in 4 seconds
    setTimeout(() => drawNumbersAutomatically(supabase, roomId, roundId), 4000);
    
  } catch (error) {
    console.error('Error in automatic number drawing:', error);
  }
}