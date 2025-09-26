import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Award, CheckCircle, Users } from 'lucide-react';
import { RoomPlayer, BingoCard as BingoCardType } from '@/types/game';
import { checkBingoPatterns, calculatePoints } from '@/lib/bingo';
import { getAvatarByName } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface RoundSummaryProps {
  roundNumber: number;
  totalRounds: number;
  currentPlayer: RoomPlayer;
  allPlayers: RoomPlayer[];
  playerCards: BingoCardType[];
  timeRemaining: number;
}

const RoundSummary: React.FC<RoundSummaryProps> = ({
  roundNumber,
  totalRounds,
  currentPlayer,
  allPlayers,
  playerCards,
  timeRemaining
}) => {
  // Calculate current player's round performance
  const roundStats = playerCards.reduce((stats, card) => {
    const patterns = checkBingoPatterns(card.marked_positions);
    return {
      totalPoints: stats.totalPoints + (card.points_earned || 0),
      totalLines: stats.totalLines + patterns.lines,
      totalBingos: stats.totalBingos + (patterns.bingo ? 1 : 0),
      cornersBonus: stats.cornersBonus + (patterns.corners ? 1 : 0),
      crossBonus: stats.crossBonus + (patterns.middleCross ? 1 : 0),
      cardsWithBingo: stats.cardsWithBingo + (patterns.bingo ? 1 : 0)
    };
  }, {
    totalPoints: 0,
    totalLines: 0,
    totalBingos: 0,
    cornersBonus: 0,
    crossBonus: 0,
    cardsWithBingo: 0
  });

  // Sort players by total score for ranking
  const sortedPlayers = [...allPlayers].sort((a, b) => b.total_score - a.total_score);
  const currentPlayerRank = sortedPlayers.findIndex(p => p.id === currentPlayer.id) + 1;

  const avatar = getAvatarByName(currentPlayer.avatar_name);

  return (
    <div className="min-h-screen bg-gradient-room p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Time Over Banner */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="bg-gradient-casino text-white rounded-lg p-6 mb-6 shadow-glow">
            <h1 className="text-4xl font-bold mb-2">⏰ TIME'S UP!</h1>
            <p className="text-xl">Round {roundNumber} Complete</p>
          </div>
          
          <div className="text-lg text-muted-foreground">
            Next round starts in <span className="text-secondary font-bold">{timeRemaining}</span> seconds
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Player Performance Summary */}
          <div className="space-y-6">
            <Card className="bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
                    {avatar?.image || '👤'}
                  </div>
                  <div>
                    <div className="text-lg">{currentPlayer.player_name}</div>
                    <div className="text-sm text-muted-foreground">Your Round Performance</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Round Points */}
                <div className="text-center bg-gradient-gold/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-secondary mb-1">
                    +{roundStats.totalPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">Points This Round</div>
                </div>

                {/* Achievements Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-accent/10 rounded-lg p-3 text-center">
                    <CheckCircle className="h-6 w-6 mx-auto mb-1 text-accent" />
                    <div className="font-bold">{roundStats.totalLines}</div>
                    <div className="text-xs text-muted-foreground">Lines</div>
                  </div>
                  
                  <div className="bg-success/10 rounded-lg p-3 text-center">
                    <Trophy className="h-6 w-6 mx-auto mb-1 text-success" />
                    <div className="font-bold">{roundStats.totalBingos}</div>
                    <div className="text-xs text-muted-foreground">Bingos</div>
                  </div>
                  
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <Target className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="font-bold">{roundStats.cornersBonus}</div>
                    <div className="text-xs text-muted-foreground">Corners</div>
                  </div>
                  
                  <div className="bg-secondary/10 rounded-lg p-3 text-center">
                    <Award className="h-6 w-6 mx-auto mb-1 text-secondary" />
                    <div className="font-bold">{roundStats.crossBonus}</div>
                    <div className="text-xs text-muted-foreground">Crosses</div>
                  </div>
                </div>

                {/* Special Achievements */}
                {roundStats.cardsWithBingo > 0 && (
                  <div className="bg-gradient-casino/10 border border-secondary/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-secondary">
                      <Trophy className="h-5 w-5" />
                      <span className="font-bold">
                        {roundStats.cardsWithBingo > 1 
                          ? `Multiple Bingos! (${roundStats.cardsWithBingo} cards)` 
                          : 'BINGO Achievement!'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scoreboard */}
          <div>
            <Card className="bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Scoreboard - Round {roundNumber}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedPlayers.map((player, index) => {
                    const playerAvatar = getAvatarByName(player.avatar_name);
                    const isCurrentPlayer = player.id === currentPlayer.id;
                    const rank = index + 1;
                    
                    return (
                      <div
                        key={player.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                          isCurrentPlayer 
                            ? "border-secondary bg-secondary/10 shadow-glow" 
                            : "border-border bg-card/30",
                          rank === 1 && "border-amber-500/50 bg-amber-500/10",
                          rank === 2 && "border-gray-400/50 bg-gray-400/10",
                          rank === 3 && "border-amber-600/50 bg-amber-600/10"
                        )}
                      >
                        {/* Rank */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          rank === 1 && "bg-amber-500 text-white",
                          rank === 2 && "bg-gray-400 text-white",
                          rank === 3 && "bg-amber-600 text-white",
                          rank > 3 && "bg-muted text-muted-foreground"
                        )}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </div>

                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg">
                          {playerAvatar?.image || '👤'}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-semibold truncate",
                            isCurrentPlayer && "text-secondary"
                          )}>
                            {player.player_name}
                            {isCurrentPlayer && <span className="text-xs ml-1">(You)</span>}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="font-bold text-lg">{player.total_score}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current Player Rank */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-center text-sm">
                    You are currently in 
                    <span className={cn(
                      "font-bold mx-1",
                      currentPlayerRank === 1 && "text-amber-500",
                      currentPlayerRank === 2 && "text-gray-400",
                      currentPlayerRank === 3 && "text-amber-600",
                      currentPlayerRank > 3 && "text-muted-foreground"
                    )}>
                      {currentPlayerRank === 1 ? '1st' : 
                       currentPlayerRank === 2 ? '2nd' : 
                       currentPlayerRank === 3 ? '3rd' : 
                       `${currentPlayerRank}th`} place
                    </span>
                    of {allPlayers.length} players
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Progress to Next Round */}
        <div className="mt-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Round {roundNumber}</span>
              <span>{roundNumber} of {totalRounds}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-casino h-2 rounded-full transition-all duration-300"
                style={{ width: `${(roundNumber / totalRounds) * 100}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {roundNumber < totalRounds 
                ? `${totalRounds - roundNumber} rounds remaining`
                : 'Final round complete!'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundSummary;