import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AvatarSelector from '@/components/ui/avatar-selector';
import { Plus, Users, Trophy, Sparkles, Volume2, LogIn, LogOut, User } from 'lucide-react';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { cn } from '@/lib/utils';
import { getRandomAvatar, AVATAR_OPTIONS } from '@/lib/avatars';
import { useGameManager } from '@/hooks/useGameManager';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import bingoBackground from '@/assets/bingo-verse-bg.jpg';

const Index = () => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(() => getRandomAvatar().name);
  const [gameMode, setGameMode] = useState<'create' | 'join' | null>(null);
  const { createGame, joinGame, loading } = useGameManager();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleCreateGame = async () => {
    const finalPlayerName = playerName || `Player ${Math.floor(Math.random() * 1000)}`;
    await createGame(finalPlayerName, selectedAvatar, true);
  };

  const handleJoinGame = async () => {
    const finalPlayerName = playerName || `Player ${Math.floor(Math.random() * 1000)}`;
    await joinGame(roomCode, finalPlayerName, selectedAvatar);
  };

  const handlePlayAnonymously = () => {
    if (gameMode === 'create') {
      handleCreateGame();
    } else {
      handleJoinGame();
    }
  };

  return (
    <div 
      className="min-h-screen bg-background relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(20, 20, 30, 0.85), rgba(20, 20, 30, 0.85)), url(${bingoBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-1/2 right-20 w-48 h-48 bg-secondary/5 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-accent/5 rounded-full blur-xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header with Auth */}
        <div className="text-center mb-12">
          {/* Auth Bar */}
          <div className="flex justify-end mb-6">
            {authLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : user ? (
              <div className="flex items-center gap-4 bg-card/50 rounded-lg px-4 py-2 border border-primary/20">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm text-foreground">Welcome back!</span>
                </div>
                <div className="flex items-center gap-2">
                  <ProfileDialog />
                  <Button 
                    onClick={signOut}
                    variant="outline" 
                    size="sm"
                    className="bg-transparent border-primary/20 hover:bg-primary/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => navigate('/auth')}
                variant="outline"
                className="bg-card/50 border-primary/20 hover:bg-primary/10"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In / Sign Up
              </Button>
            )}
          </div>

          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-casino bg-clip-text text-transparent">
              BINGO
            </span>
            <span className="text-foreground mx-4">•</span>
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              VERSE
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join the ultimate multiplayer Bingo experience with real-time gameplay, 
            voice callouts, and competitive scoring across the universe!
          </p>
          
          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge variant="outline" className="bg-card/50 border-primary/20">
              <Users className="w-3 h-3 mr-1" />
              Up to 10 Players
            </Badge>
            <Badge variant="outline" className="bg-card/50 border-primary/20">
              <Volume2 className="w-3 h-3 mr-1" />
              Voice Callouts
            </Badge>
            <Badge variant="outline" className="bg-card/50 border-primary/20">
              <Trophy className="w-3 h-3 mr-1" />
              Real-time Scoring
            </Badge>
            <Badge variant="outline" className="bg-card/50 border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Private Rooms
            </Badge>
          </div>
        </div>

        {/* Main Menu */}
        {!gameMode && (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="bg-gradient-room border-primary/20 hover:border-primary/40 transition-all cursor-pointer hover:scale-105 hover:shadow-casino"
                onClick={() => navigate('/configure-game')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-gradient-casino rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Create Game</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Host a new Bingo room and invite friends with a room code
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="bg-gradient-room border-primary/20 hover:border-primary/40 transition-all cursor-pointer hover:scale-105 hover:shadow-electric"
                onClick={() => setGameMode('join')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-gradient-electric rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Join Game</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter a room code to join an existing Bingo game
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Setup Form */}
        {gameMode && (
          <div className="max-w-md mx-auto">
            <Card className="bg-gradient-room border-primary/20 shadow-casino">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl bg-gradient-gold bg-clip-text text-transparent">
                  {gameMode === 'create' ? 'Create Your Game' : 'Join Game'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {gameMode === 'create' 
                    ? 'Set up your Bingo room and get ready to host!'
                    : 'Enter the room code to join the fun!'
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Room Code Input (Join only) */}
                {gameMode === 'join' && (
                  <div className="space-y-2">
                    <Label htmlFor="roomCode" className="font-semibold">
                      Room Code
                    </Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter 5-character code (e.g., A7K3Q)"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="text-center text-lg font-bold bg-card/50 border-primary/20"
                    />
                  </div>
                )}

                {/* Player Name */}
                <div className="space-y-2">
                  <Label htmlFor="playerName" className="font-semibold">
                    Player Name (Optional)
                  </Label>
                  <Input
                    id="playerName"
                    placeholder="Enter your name or play anonymously"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="bg-card/50 border-primary/20"
                  />
                </div>

                {/* Avatar Selection */}
                <div className="space-y-2">
                  <Label className="font-semibold">Choose Avatar</Label>
                  <AvatarSelector
                    selectedAvatar={selectedAvatar}
                    onAvatarSelect={setSelectedAvatar}
                    trigger={
                      <Button 
                        variant="outline" 
                        className="w-full bg-card/50 hover:bg-accent border-primary/20 h-12"
                      >
                        <span className="text-2xl mr-3">
                          {AVATAR_OPTIONS.find(a => a.name === selectedAvatar)?.image || '👤'}
                        </span>
                        <span className="flex-1">
                          Choose Avatar
                        </span>
                      </Button>
                    }
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={playerName ? (gameMode === 'create' ? handleCreateGame : handleJoinGame) : handlePlayAnonymously}
                    disabled={(gameMode === 'join' && roomCode.length !== 5) || loading}
                    variant="casino"
                    size="xl"
                    className="w-full"
                  >
                    {loading ? 'Please wait...' : (gameMode === 'create' ? 'Create Game' : 'Join Game')}
                  </Button>
                  
                  {!playerName && (
                    <Button
                      onClick={handlePlayAnonymously}
                      disabled={(gameMode === 'join' && roomCode.length !== 5) || loading}
                      variant="outline"
                      className="w-full border-secondary/50 hover:bg-secondary/10"
                    >
                      {loading ? 'Please wait...' : 'Play Anonymously'}
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setGameMode(null)}
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Back to Menu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-muted-foreground">
          <p className="text-sm">
            No money involved • Secure • Real-time • Fair Play • Up to 10 players per room
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;