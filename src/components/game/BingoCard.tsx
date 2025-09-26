import React from 'react';
import { cn } from '@/lib/utils';
import { getBingoLetter, getGridPosition, checkBingoPatterns } from '@/lib/bingo';

interface BingoCardProps {
  numbers: number[];
  markedPositions: boolean[];
  onNumberClick: (index: number) => void;
  drawnNumbers: number[];
  isWinner: boolean;
  playerName: string;
  cardNumber?: number;
  disabled?: boolean;
  visualHints?: boolean;
}

const BingoCard: React.FC<BingoCardProps> = ({
  numbers,
  markedPositions,
  onNumberClick,
  drawnNumbers,
  isWinner,
  playerName,
  cardNumber = 1,
  disabled = false,
  visualHints = true
}) => {
  const patterns = checkBingoPatterns(markedPositions);
  
  const isNumberDrawn = (number: number) => {
    return number === 0 || (visualHints && drawnNumbers.includes(number)); // 0 is FREE space
  };

  const getNumberStatus = (number: number, index: number) => {
    const isMarked = markedPositions[index];
    const isDrawn = isNumberDrawn(number);
    const isFree = number === 0;
    
    return {
      isMarked,
      isDrawn,
      isFree,
      canMark: isDrawn && !isMarked && !isFree && !disabled
    };
  };

  return (
    <div className={cn(
      "bg-card rounded-lg border-2 p-4 transition-all",
      isWinner 
        ? "border-success shadow-glow-winner animate-bingo-glow" 
        : "border-border hover:border-primary/50",
      disabled && "opacity-60"
    )}>
      {/* Card Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold text-foreground">
          {playerName}
          {cardNumber > 1 && <span className="text-muted-foreground ml-1">#{cardNumber}</span>}
        </div>
        {isWinner && (
          <div className="text-xs bg-success/20 text-success px-2 py-1 rounded-full font-bold">
            BINGO!
          </div>
        )}
      </div>

      {/* BINGO Header */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {['B', 'I', 'N', 'G', 'O'].map((letter) => (
          <div key={letter} className="text-center font-bold text-lg text-secondary py-2">
            {letter}
          </div>
        ))}
      </div>

      {/* Number Grid */}
      <div className="grid grid-cols-5 gap-1">
        {numbers.map((number, index) => {
          const { isMarked, isDrawn, isFree, canMark } = getNumberStatus(number, index);
          const { row, col } = getGridPosition(index);
          
          return (
            <button
              key={index}
              onClick={() => !disabled && onNumberClick(index)}
              disabled={disabled || !canMark}
              className={cn(
                "aspect-square flex items-center justify-center text-sm font-bold rounded-md transition-all",
                "border-2 hover:scale-105 active:scale-95",
                
                // Free space styling
                isFree && "bg-gradient-gold text-foreground border-secondary",
                
                // Marked number styling
                isMarked && !isFree && "bg-gradient-casino text-primary-foreground border-primary shadow-casino",
                
                // Drawable but not marked
                canMark && "bg-accent hover:bg-primary/20 border-primary/50 hover:border-primary cursor-pointer",
                
                // Not drawable
                !isDrawn && !isMarked && !isFree && "bg-muted text-muted-foreground border-border",
                
                // Disabled state
                disabled && "cursor-not-allowed opacity-60"
              )}
              title={isFree ? "FREE" : `${getBingoLetter(number)} ${number}${isDrawn ? ' (drawn)' : ''}`}
            >
              {isFree ? (
                <span className="text-xs font-bold">FREE</span>
              ) : (
                <span className={cn(
                  isMarked && "animate-number-reveal"
                )}>
                  {number}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Card Stats */}
      <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
        <div>Lines: {patterns.lines}</div>
        <div className="flex gap-2">
          {patterns.corners && (
            <span className="bg-accent/50 px-2 py-1 rounded text-accent-foreground">
              Corners
            </span>
          )}
          {patterns.bingo && (
            <span className="bg-success/20 px-2 py-1 rounded text-success font-bold">
              FULL CARD
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BingoCard;