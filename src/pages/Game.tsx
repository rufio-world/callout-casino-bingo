import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BingoCard from '@/components/game/BingoCard';
import NumberDrawDisplay from '@/components/game/NumberDrawDisplay';
import { DrawnNumber, GameRoom, RoomPlayer, GameRound, BingoCard as BingoCardType } from '@/types/game';
import { generateBingoCard, getBingoLetter, announceNumber } from '@/lib/bingo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Trophy, Clock, Home } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

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
            setCurrentRound(payload.new as GameRound);
            updateDrawnNumbers(payload.new as GameRound);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundChannel);
    };
  }, [roomCode, navigate]);

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
      // Update card in database
      const { error } = await supabase
        .from('bingo_cards')
        .update({ marked_positions: newMarkedPositions })
        .eq('id', card.id);

      if (error) {
        console.error('Error updating card:', error);
        return;
      }

      // Update local state
      setCards(prev => prev.map((c, i) => 
        i === cardIndex 
          ? { ...c, marked_positions: newMarkedPositions }
          : c
      ));

    } catch (error) {
      console.error('Error updating card:', error);
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

  return (
    <div className="min-h-screen bg-gradient-room p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
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
          
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">
              Round {roundNumber} of {totalRounds}
            </div>
            {currentNumber && (
              <div className="text-3xl font-bold text-secondary">
                {announceNumber(currentNumber)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Number Display */}
          <div className="lg:col-span-2">
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

          {/* Players & Scores */}
          <div>
            <Card className="bg-card/50 border-primary/20 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-2 rounded bg-card/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {player.avatar_name === 'default-avatar' ? '👤' : '🐻'}
                        </span>
                        <span className="font-semibold">{player.player_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-secondary" />
                        <span className="font-bold">{player.total_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bingo Cards */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Your Bingo Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
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

        {/* Game Status */}
        {!isGameActive && drawnNumbers.length > 0 && (
          <div className="text-center mt-8">
            <Card className="bg-card/50 border-primary/20 max-w-md mx-auto">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">Round Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  Numbers drawn: {drawnNumbers.length}
                </p>
                <p className="text-muted-foreground">
                  Waiting for next round to start...
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;