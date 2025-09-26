import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check for bingo patterns (lines, full card, corners, middle cross)
const checkBingoPatterns = (markedPositions: boolean[]) => {
  const patterns = {
    lines: 0,
    bingo: false,
    corners: false,
    middleCross: false
  };
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    const rowComplete = Array.from({ length: 5 }, (_, col) => markedPositions[row * 5 + col]).every(Boolean);
    if (rowComplete) patterns.lines++;
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    const colComplete = Array.from({ length: 5 }, (_, row) => markedPositions[row * 5 + col]).every(Boolean);
    if (colComplete) patterns.lines++;
  }
  
  // Check diagonals
  const diagonal1 = [0, 6, 12, 18, 24].every(pos => markedPositions[pos]);
  const diagonal2 = [4, 8, 12, 16, 20].every(pos => markedPositions[pos]);
  
  if (diagonal1) patterns.lines++;
  if (diagonal2) patterns.lines++;
  
  // Check full card
  patterns.bingo = markedPositions.every(Boolean);
  
  // Check corners (0, 4, 20, 24)
  patterns.corners = [0, 4, 20, 24].every(pos => markedPositions[pos]);
  
  // Check middle cross (middle row + middle column)
  const middleRow = [10, 11, 12, 13, 14].every(pos => markedPositions[pos]); // Row 2 (0-indexed)
  const middleCol = [2, 7, 12, 17, 22].every(pos => markedPositions[pos]);   // Col 2 (0-indexed)
  patterns.middleCross = middleRow && middleCol;
  
  return patterns;
};

// Calculate points based on game rules
const calculatePoints = (
  linesCompleted: number,
  hasBingo: boolean,
  hasCorners: boolean,
  hasMiddleCross: boolean,
  multiCardBonus: number = 0
): number => {
  let points = 0;
  
  // 2 points per line
  points += linesCompleted * 2;
  
  // 4 points for full bingo
  if (hasBingo) points += 4;
  
  // 1 point for corners bonus
  if (hasCorners) points += 1;
  
  // 2 points for middle cross (middle row + middle column)
  if (hasMiddleCross) points += 2;
  
  // Multi-card bonus points
  points += multiCardBonus;
  
  return points;
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

    const { cardId, markedPositions } = await req.json();
    console.log('Calculating points for card:', cardId);

    if (!cardId || !markedPositions) {
      throw new Error('Missing cardId or markedPositions');
    }

    // Get the card data
    const { data: card, error: cardError } = await supabaseClient
      .from('bingo_cards')
      .select('*, room_player_id')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      throw new Error(`Card not found: ${cardError?.message}`);
    }

    // Calculate patterns and points
    const patterns = checkBingoPatterns(markedPositions);
    const points = calculatePoints(
      patterns.lines,
      patterns.bingo,
      patterns.corners,
      patterns.middleCross
    );

    console.log('Patterns found:', patterns);
    console.log('Points calculated:', points);

    // Update the card with new points and winner status
    const { error: updateCardError } = await supabaseClient
      .from('bingo_cards')
      .update({
        marked_positions: markedPositions,
        points_earned: points,
        is_winner: patterns.bingo
      })
      .eq('id', cardId);

    if (updateCardError) {
      throw new Error(`Failed to update card: ${updateCardError.message}`);
    }

    // Get all cards for this player to calculate total score
    const { data: playerCards, error: cardsError } = await supabaseClient
      .from('bingo_cards')
      .select('points_earned')
      .eq('room_player_id', card.room_player_id);

    if (cardsError) {
      throw new Error(`Failed to get player cards: ${cardsError.message}`);
    }

    // Calculate total score for the player
    const totalScore = playerCards?.reduce((sum, playerCard) => sum + (playerCard.points_earned || 0), 0) || 0;

    // Update player's total score
    const { error: updatePlayerError } = await supabaseClient
      .from('room_players')
      .update({ total_score: totalScore })
      .eq('id', card.room_player_id);

    if (updatePlayerError) {
      throw new Error(`Failed to update player score: ${updatePlayerError.message}`);
    }

    console.log('Updated player total score to:', totalScore);

    return new Response(JSON.stringify({ 
      success: true, 
      points,
      patterns,
      totalScore,
      isWinner: patterns.bingo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Calculate points error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});