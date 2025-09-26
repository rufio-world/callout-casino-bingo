import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BingoCard from '@/components/game/BingoCard';
import NumberDrawDisplay from '@/components/game/NumberDrawDisplay';
import { DrawnNumber } from '@/types/game';
import { generateBingoCard, generateDrawSequence } from '@/lib/bingo';
import { Users, Trophy, Clock, Home } from 'lucide-react';

const Game = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  // Demo game state - in a real app this would come from Supabase
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumber[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(240); // 4 minutes
  const [roundNumber, setRoundNumber] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  
  // Demo bingo cards
  const [cards, setCards] = useState(() => [
    {
      id: '1',
      numbers: generateBingoCard(true),
      markedPositions: Array(25).fill(false),
      isWinner: false
    }
  ]);

  // Demo players
  const players = [
    { name: 'You', score: 0, avatar: '🐻' },
    { name: 'Player 2', score: 0, avatar: '🦊' },
    { name: 'Player 3', score: 0, avatar: '🐼' },
  ];

  // Start demo game
  useEffect(() => {
    if (!gameActive) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActive]);

  // Draw numbers every 4 seconds during active game
  useEffect(() => {
    if (!gameActive) return;

    const drawSequence = generateDrawSequence();
    let drawIndex = 0;

    const drawInterval = setInterval(() => {
      setTimeRemaining(current => {
        if (current <= 0) {
          setGameActive(false);
          return 0;
        }
        return current;
      });

      if (drawIndex >= drawSequence.length) {
        setGameActive(false);
        clearInterval(drawInterval);
        return;
      }

      const newNumber = drawSequence[drawIndex];
      setCurrentNumber(newNumber);
      
      setDrawnNumbers(prev => [...prev, {
        number: newNumber,
        timestamp: Date.now(),
        announced: true
      }]);

      drawIndex++;
    }, 4000);

    return () => clearInterval(drawInterval);
  }, [gameActive]);

  const handleStartGame = () => {
    setGameActive(true);
    setTimeRemaining(240);
    setDrawnNumbers([]);
    setCurrentNumber(null);
  };

  const handleNumberClick = (cardIndex: number, numberIndex: number) => {
    const card = cards[cardIndex];
    const number = card.numbers[numberIndex];
    
    // Check if number has been drawn
    const numberDrawn = drawnNumbers.some(d => d.number === number) || number === 0; // 0 is FREE
    
    if (!numberDrawn) return;

    setCards(prev => prev.map((c, i) => 
      i === cardIndex 
        ? {
            ...c,
            markedPositions: c.markedPositions.map((marked, idx) => 
              idx === numberIndex ? !marked : marked
            )
          }
        : c
    ));
  };

  const handleLeaveGame = () => {
    navigate('/');
  };

  if (!roomCode) {
    navigate('/');
    return null;
  }

  const allDrawnNumbers = drawnNumbers.map(d => d.number);

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
          
          {!gameActive && timeRemaining === 240 && (
            <Button onClick={handleStartGame} variant="casino" size="lg">
              Start Demo Game
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Number Display */}
          <div className="lg:col-span-2">
            <NumberDrawDisplay
              currentNumber={currentNumber}
              drawnNumbers={drawnNumbers}
              timeRemaining={timeRemaining}
              roundNumber={roundNumber}
              totalRounds={5}
              isGameActive={gameActive}
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
                    <div key={index} className="flex items-center justify-between p-2 rounded bg-card/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{player.avatar}</span>
                        <span className="font-semibold">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-secondary" />
                        <span className="font-bold">{player.score}</span>
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
                markedPositions={card.markedPositions}
                onNumberClick={(numberIndex) => handleNumberClick(index, numberIndex)}
                drawnNumbers={allDrawnNumbers}
                isWinner={card.isWinner}
                playerName="Your Card"
                cardNumber={index + 1}
                disabled={!gameActive}
              />
            ))}
          </div>
        </div>

        {/* Game Status */}
        {!gameActive && drawnNumbers.length > 0 && (
          <div className="text-center mt-8">
            <Card className="bg-card/50 border-primary/20 max-w-md mx-auto">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">Round Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  Numbers drawn: {drawnNumbers.length}
                </p>
                <Button onClick={handleStartGame} variant="casino">
                  Start Next Round
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;