import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarByName } from '@/lib/avatars';
import { RoomPlayer, GameRoom } from '@/types/game';
import { Users, Crown, Copy, Settings, Play, Timer, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameLobbyProps {
  room: GameRoom;
  players: RoomPlayer[];
  currentPlayer: RoomPlayer;
  isHost: boolean;
  onGameStart: () => void;
  onLeaveRoom: () => void;
  onUpdateSettings: (settings: Partial<GameRoom>) => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onGameStart,
  onLeaveRoom,
  onUpdateSettings
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hostPlayer = players.find(p => p.role === 'host');
  const canStartGame = players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-room p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-casino bg-clip-text text-transparent">GAME</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span className="bg-gradient-gold bg-clip-text text-transparent">LOBBY</span>
          </h1>
          
          {/* Room Code */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Room Code:</span>
              <Badge 
                variant="outline" 
                className="text-2xl font-bold py-2 px-4 bg-card/50 border-secondary cursor-pointer hover:bg-secondary/10"
                onClick={copyRoomCode}
              >
                {room.room_code}
                <Copy className="ml-2 h-4 w-4" />
              </Badge>
            </div>
            {copied && (
              <span className="text-success text-sm animate-fade-in">Copied!</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players ({players.length}/{room.max_players})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {players.map((player) => {
                    const avatar = getAvatarByName(player.avatar_name);
                    const isCurrentPlayer = player.id === currentPlayer.id;
                    
                    return (
                      <div
                        key={player.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                          isCurrentPlayer 
                            ? "border-secondary bg-secondary/10 shadow-gold" 
                            : "border-border bg-card/30"
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                            {avatar?.image || '👤'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-semibold truncate",
                              isCurrentPlayer && "text-secondary"
                            )}>
                              {player.player_name}
                            </span>
                            {player.role === 'host' && (
                              <Crown className="h-4 w-4 text-secondary" />
                            )}
                            {isCurrentPlayer && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          {player.is_anonymous && (
                            <span className="text-xs text-muted-foreground">Anonymous</span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-semibold">{player.total_score} pts</div>
                          <div className="text-xs text-muted-foreground">Total Score</div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: room.max_players - players.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-muted bg-muted/20"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground">Waiting for player...</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Settings & Controls */}
          <div className="space-y-6">
            {/* Game Settings (Host Only) */}
            {isHost && (
              <Card className="bg-card/50 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Game Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of Rounds</Label>
                    <Select
                      value={room.rounds_total.toString()}
                      onValueChange={(value) => onUpdateSettings({ rounds_total: parseInt(value) })}
                    >
                      <SelectTrigger className="bg-card/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Rounds
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cards per Player</Label>
                    <Select
                      value={room.cards_per_player.toString()}
                      onValueChange={(value) => onUpdateSettings({ cards_per_player: parseInt(value) })}
                    >
                      <SelectTrigger className="bg-card/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} Card{num > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="free-center">Free Center Space</Label>
                    <Switch
                      id="free-center"
                      checked={room.free_center}
                      onCheckedChange={(checked) => onUpdateSettings({ free_center: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Info */}
            <Card className="bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Game Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Rounds</div>
                    <div className="font-semibold">{room.rounds_total}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cards</div>
                    <div className="font-semibold">{room.cards_per_player}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Duration</div>
                    <div className="font-semibold flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      4:00 / round
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Free Center</div>
                    <div className="font-semibold">{room.free_center ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• New number every 4 seconds</div>
                  <div>• 2 points per line completed</div>
                  <div>• 4 points for full BINGO</div>
                  <div>• Bonus points for corners & multi-cards</div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isHost ? (
                <Button
                  onClick={onGameStart}
                  disabled={!canStartGame}
                  variant="casino"
                  size="xl"
                  className="w-full"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Game
                  {!canStartGame && ' (Need 2+ Players)'}
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground mb-3">
                    Waiting for {hostPlayer?.player_name} to start the game...
                  </p>
                  <div className="animate-pulse">
                    <div className="h-2 bg-gradient-casino rounded-full mb-2" />
                    <div className="text-sm text-secondary">Ready to play!</div>
                  </div>
                </div>
              )}

              <Button
                onClick={onLeaveRoom}
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                Leave Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;