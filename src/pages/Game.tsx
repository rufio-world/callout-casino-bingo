import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BingoCard from '@/components/game/BingoCard';
import NumberDrawDisplay from '@/components/game/NumberDrawDisplay';
import RoundSummary from '@/components/game/RoundSummary';
import { DrawnNumber, GameRoom, RoomPlayer, GameRound, BingoCard as BingoCardType } from '@/types/game';
import { generateBingoCard, getBingoLetter, announceNumber } from '@/lib/bingo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Trophy, Clock, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const Game = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Game state from Supabase
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<RoomPlayer | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [cards, setCards] = useState<BingoCardType[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumber[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(240);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [roundPoints, setRoundPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [summaryCountdown, setSummaryCountdown] = useState(10);

  // Load game data and set up real-time subscriptions
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    loadGameData();
    
    // Set up real-time subscription for round updates
    const roundChannel = supabase
      .channel('game-round-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds'
        },
        (payload) => {
          if (payload.new) {
            const newRound = payload.new as GameRound;
            setCurrentRound(newRound);
            updateDrawnNumbers(newRound);
            
            // Check if round just completed
            if (payload.old && 
                (payload.old as any)?.status === 'active' && 
                newRound.status === 'completed') {
              handleRoundComplete();
            }
            
            // Check if new round started
            if (payload.old && 
                newRound.round_number !== (payload.old as any)?.round_number) {
              handleNewRoundStart(newRound);
            }
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for room updates
    const roomChannel = supabase
      .channel('game-room-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms'
        },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new as GameRoom);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for player score updates
    const playersChannel = supabase
      .channel('room-players-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_players'
        },
        (payload) => {
          if (payload.new) {
            const updatedPlayer = payload.new as RoomPlayer;
            setPlayers(prev => prev.map(p => 
              p.id === updatedPlayer.id ? updatedPlayer : p
            ));
            
            // Update current player if it's them
            if (currentPlayer && updatedPlayer.id === currentPlayer.id) {
              setCurrentPlayer(updatedPlayer);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundChannel);
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [roomCode, navigate]);

  // Handle round completion
  const handleRoundComplete = () => {
    console.log('Round completed - showing summary');
    setShowRoundSummary(true);
    setSummaryCountdown(10);
  };

  // Handle new round start
  const handleNewRoundStart = (newRound: GameRound) => {
    console.log('New round started:', newRound.round_number);
    setShowRoundSummary(false);
    setTimeRemaining(240);
    // Reload cards for new round
    if (currentPlayer) {
      loadPlayerCards();
    }
  };

  // Summary countdown timer
  useEffect(() => {
    if (!showRoundSummary) return;

    const interval = setInterval(() => {
      setSummaryCountdown(prev => {
        if (prev <= 1) {
          // Start next round
          startNextRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showRoundSummary]);

  // Start next round
  const startNextRound = async () => {
    if (!roomCode) return;
    
    try {
      console.log('Starting next round...');
      const { data, error } = await supabase.functions.invoke('game-controller', {
        body: {
          action: 'start_next_round',
          roomCode: roomCode
        }
      });

      if (error) {
        console.error('Error starting next round:', error);
        return;
      }

      if (data?.gameComplete) {
        // Game is finished
        toast({
          title: "🎉 Game Complete!",
          description: "All rounds finished. Check the final scoreboard!",
          duration: 5000,
        });
        // Could navigate to final results or stay on summary
        return;
      }

      console.log('Next round started successfully');
    } catch (error) {
      console.error('Error starting next round:', error);
      toast({
        title: "Error",
        description: "Failed to start next round",
        variant: "destructive",
      });
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!currentRound || currentRound.status !== 'active') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Round should be ending
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound]);

  const loadGameData = async () => {
    try {
      // Load room data
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError) {
        console.error('Room error:', roomError);
        navigate('/');
        return;
      }

      setRoom(roomData);

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersError) {
        console.error('Players error:', playersError);
        return;
      }

      setPlayers(playersData || []);
      
      // Find current player based on authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && playersData) {
        // Find player by matching user_id through profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          const currentPlayerData = playersData.find(p => p.profile_id === profile.id);
          if (currentPlayerData) {
            setCurrentPlayer(currentPlayerData);
          }
        }
      }
      
      // Fallback to first player for demo/anonymous users
      if (!currentPlayer && playersData && playersData.length > 0) {
        setCurrentPlayer(playersData[0]);
      }

      // Load current round
      const { data: roundData, error: roundError } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('round_number', roomData.current_round_number)
        .single();

      if (!roundError && roundData) {
        setCurrentRound(roundData);
        updateDrawnNumbers(roundData);
        
        // Calculate time remaining
        const startTime = new Date(roundData.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, 240 - elapsed);
        setTimeRemaining(remaining);
      }

      // Load bingo cards for current player after identifying them
      // This will be done after setting currentPlayer

    } catch (error) {
      console.error('Error loading game:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load cards when currentPlayer changes
  useEffect(() => {
    if (currentPlayer && currentRound) {
      loadPlayerCards();
    }
  }, [currentPlayer, currentRound]);

  // Calculate round points when cards change
  useEffect(() => {
    if (cards.length > 0) {
      calculateRoundPoints();
    }
  }, [cards]);

  const calculateRoundPoints = () => {
    let totalPoints = 0;
    cards.forEach(card => {
      totalPoints += card.points_earned || 0;
    });
    setRoundPoints(totalPoints);
  };

  const loadPlayerCards = async () => {
    if (!currentPlayer || !currentRound) return;
    
    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('room_player_id', currentPlayer.id)
        .eq('round_id', currentRound.id);

      if (!cardsError && cardsData) {
        setCards(cardsData);
      } else {
        console.error('Error loading cards:', cardsError);
      }
    } catch (error) {
      console.error('Error loading player cards:', error);
    }
  };

  const updateDrawnNumbers = (round: GameRound) => {
    const drawnCount = round.current_draw_index;
    const numbers: DrawnNumber[] = [];
    
    for (let i = 0; i < drawnCount; i++) {
      if (round.draw_sequence[i]) {
        numbers.push({
          number: round.draw_sequence[i],
          timestamp: Date.now() - (drawnCount - i) * 4000,
          announced: true
        });
      }
    }
    
    setDrawnNumbers(numbers);
    setCurrentNumber(numbers.length > 0 ? numbers[numbers.length - 1].number : null);
  };

  // This function is now not needed as game is controlled by host

  const handleNumberClick = async (cardIndex: number, numberIndex: number) => {
    const card = cards[cardIndex];
    const number = card.numbers[numberIndex];
    
    // Check if number has been drawn or is FREE space
    const visualHintsEnabled = room?.visual_hints ?? true;
    const numberDrawn = number === 0 || (visualHintsEnabled && drawnNumbers.some(d => d.number === number));
    
    if (!numberDrawn && visualHintsEnabled) return;

    const newMarkedPositions = [...card.marked_positions];
    newMarkedPositions[numberIndex] = !newMarkedPositions[numberIndex];

    try {
      // Call the edge function to calculate points and update the database
      const { data, error } = await supabase.functions.invoke('calculate-points', {
        body: {
          cardId: card.id,
          markedPositions: newMarkedPositions
        }
      });

      if (error) {
        console.error('Error calculating points:', error);
        return;
      }

      const result = data;
      console.log('Points calculation result:', result);

      // Update local state with new card data
      setCards(prev => prev.map((c, i) => 
        i === cardIndex 
          ? { 
              ...c, 
              marked_positions: newMarkedPositions,
              points_earned: result.points,
              is_winner: result.isWinner
            }
          : c
      ));

      // Update player total score if current player
      if (currentPlayer && result.totalScore !== undefined) {
        setPlayers(prev => prev.map(p => 
          p.id === currentPlayer.id 
            ? { ...p, total_score: result.totalScore }
            : p
        ));
      }

      // Show celebration for bingo
      if (result.isWinner && !card.is_winner) {
        toast({
          title: "🎉 BINGO!",
          description: `You got a full card! +${result.points} points`,
          duration: 5000,
        });
      } else if (result.patterns?.middleCross && result.points > (card.points_earned || 0)) {
        toast({
          title: "✨ Middle Cross!",
          description: "+2 bonus points for middle cross pattern",
          duration: 3000,
        });
      } else if (result.patterns?.corners && result.points > (card.points_earned || 0)) {
        toast({
          title: "🎯 Corners!",
          description: "+1 bonus point for all corners",
          duration: 3000,
        });
      }

    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: "Error",
        description: "Failed to update card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveGame = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-room flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!roomCode || !room || !currentPlayer) {
    navigate('/');
    return null;
  }

  const allDrawnNumbers = drawnNumbers.map(d => d.number);
  const isGameActive = currentRound?.status === 'active';
  const roundNumber = room.current_round_number;
  const totalRounds = room.rounds_total;

  // Show round summary screen
  if (showRoundSummary && currentPlayer) {
    return (
      <RoundSummary
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        currentPlayer={currentPlayer}
        allPlayers={players}
        playerCards={cards}
        timeRemaining={summaryCountdown}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-room p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header with Player Round Points */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleLeaveGame}
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Home className="w-4 h-4 mr-1" />
              Leave Game
            </Button>
            <div className="text-sm text-muted-foreground">
              Room: <span className="font-bold text-secondary">{roomCode}</span>
            </div>
          </div>
          
          {/* Current Player Round Points */}
          <div className="text-center">
            <div className="bg-card/50 border border-primary/20 rounded-lg px-4 py-2 mb-2">
              <div className="text-sm text-muted-foreground">Round Points</div>
              <div className="text-2xl font-bold text-secondary">{roundPoints}</div>
            </div>
            <div className="text-lg font-semibold">
              Round {roundNumber} of {totalRounds}
            </div>
            {currentNumber && (
              <div className="text-3xl font-bold text-secondary mt-2">
                {announceNumber(currentNumber)}
              </div>
            )}
          </div>
          
          <div className="w-24"></div> {/* Spacer for balance */}
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Number Display - Takes up 3 columns on xl screens */}
          <div className="xl:col-span-3">
            <NumberDrawDisplay
              currentNumber={currentNumber}
              drawnNumbers={drawnNumbers}
              timeRemaining={timeRemaining}
              roundNumber={roundNumber}
              totalRounds={totalRounds}
              isGameActive={isGameActive}
              audioEnabled={audioEnabled}
              onAudioToggle={() => setAudioEnabled(!audioEnabled)}
            />
          </div>

          {/* Game Status - Only show when game is not active */}
          <div className="xl:col-span-1">
            {!isGameActive && drawnNumbers.length > 0 && (
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="pt-6 text-center">
                  <h3 className="text-xl font-bold mb-2">Round Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    Numbers drawn: {drawnNumbers.length}
                  </p>
                  <p className="text-muted-foreground">
                    Waiting for next round...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bingo Cards - Always visible and properly spaced */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Your Bingo Cards</h2>
          <div className={cn(
            "grid gap-4 max-w-full mx-auto",
            cards.length === 1 && "grid-cols-1 max-w-md",
            cards.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-4xl",
            cards.length === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl",
            cards.length === 4 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-4 max-w-7xl"
          )}>
            {cards.map((card, index) => (
              <BingoCard
                key={card.id}
                numbers={card.numbers}
                markedPositions={card.marked_positions}
                onNumberClick={(numberIndex) => handleNumberClick(index, numberIndex)}
                drawnNumbers={allDrawnNumbers}
                isWinner={card.is_winner}
                playerName="Your Card"
                cardNumber={card.card_number}
                disabled={!isGameActive}
                visualHints={room?.visual_hints ?? true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;