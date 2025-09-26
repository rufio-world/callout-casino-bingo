import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { getBingoLetter, announceNumber, formatTimeRemaining } from '@/lib/bingo';
import { DrawnNumber } from '@/types/game';
import { cn } from '@/lib/utils';

interface NumberDrawDisplayProps {
  currentNumber: number | null;
  drawnNumbers: DrawnNumber[];
  timeRemaining: number;
  roundNumber: number;
  totalRounds: number;
  isGameActive: boolean;
  audioEnabled: boolean;
  onAudioToggle: () => void;
  onNumberSpoken?: (number: number) => void;
}

const NumberDrawDisplay: React.FC<NumberDrawDisplayProps> = ({
  currentNumber,
  drawnNumbers,
  timeRemaining,
  roundNumber,
  totalRounds,
  isGameActive,
  audioEnabled,
  onAudioToggle,
  onNumberSpoken
}) => {
  const [showAnimation, setShowAnimation] = useState(false);

  // Animate new number reveal
  useEffect(() => {
    if (currentNumber) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 600);
      return () => clearTimeout(timer);
    }
  }, [currentNumber]);

  // Speak the number using Web Speech API
  const speakNumber = (number: number) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;

    const announcement = announceNumber(number);
    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    
    speechSynthesis.speak(utterance);
    onNumberSpoken?.(number);
  };

  // Auto-speak new numbers
  useEffect(() => {
    if (currentNumber && audioEnabled) {
      speakNumber(currentNumber);
    }
  }, [currentNumber, audioEnabled]);

  const recentNumbers = drawnNumbers.slice(-10).reverse();
  const bingoLetter = currentNumber ? getBingoLetter(currentNumber) : null;

  return (
    <div className="space-y-4">
      {/* Current Number Display */}
      <Card className={cn(
        "relative overflow-hidden border-2 p-6 text-center transition-all",
        currentNumber 
          ? "border-secondary bg-gradient-gold shadow-glow-number" 
          : "border-border bg-card/50"
      )}>
        {/* Background Animation */}
        {showAnimation && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/30 to-transparent -skew-x-12 animate-[slide-in-right_0.6s_ease-out]" />
        )}
        
        {/* Main Content */}
        <div className="relative z-10">
          {currentNumber ? (
            <>
              <div className={cn(
                "text-8xl font-bold mb-2 transition-all",
                showAnimation && "animate-number-reveal"
              )}>
                <span className="text-secondary-foreground">
                  {bingoLetter}
                </span>
                <span className="ml-2 text-6xl">
                  {currentNumber}
                </span>
              </div>
              <p className="text-xl text-secondary-foreground/80 font-semibold">
                {announceNumber(currentNumber)}
              </p>
            </>
          ) : (
            <div className="py-8">
              <div className="text-6xl text-muted-foreground mb-2">--</div>
              <p className="text-lg text-muted-foreground">
                {isGameActive ? 'Next number...' : 'Game not started'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Game Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-card/50 border-primary/20">
            Round {roundNumber} of {totalRounds}
          </Badge>
          
          <div className={cn(
            "flex items-center gap-2 text-lg font-mono",
            timeRemaining <= 30 && "text-destructive animate-pulse"
          )}>
            <span className="text-muted-foreground">Time:</span>
            <span className="font-bold">
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
        </div>

        <Button
          onClick={onAudioToggle}
          variant="outline"
          size="sm"
          className={cn(
            "border-primary/20",
            audioEnabled 
              ? "bg-success/10 border-success/50 text-success hover:bg-success/20" 
              : "bg-muted/20 text-muted-foreground"
          )}
        >
          {audioEnabled ? (
            <Volume2 className="h-4 w-4 mr-1" />
          ) : (
            <VolumeX className="h-4 w-4 mr-1" />
          )}
          {audioEnabled ? 'Audio On' : 'Audio Off'}
        </Button>
      </div>

      {/* Recent Numbers */}
      {recentNumbers.length > 0 && (
        <Card className="bg-card/50 border-primary/20 p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Recent Numbers ({drawnNumbers.length} total)
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentNumbers.map((drawnNumber, index) => {
              const letter = getBingoLetter(drawnNumber.number);
              const isLatest = index === 0;
              
              return (
                <Badge
                  key={`${drawnNumber.number}-${drawnNumber.timestamp}`}
                  variant={isLatest ? "default" : "outline"}
                  className={cn(
                    "text-sm font-mono cursor-pointer hover:scale-110 transition-transform",
                    isLatest && "bg-gradient-casino text-primary-foreground shadow-casino animate-pulse"
                  )}
                  onClick={() => audioEnabled && speakNumber(drawnNumber.number)}
                  title={`Click to hear: ${announceNumber(drawnNumber.number)}`}
                >
                  {letter}{drawnNumber.number}
                </Badge>
              );
            })}
          </div>
          
          {audioEnabled && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Click any number to hear it again
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default NumberDrawDisplay;