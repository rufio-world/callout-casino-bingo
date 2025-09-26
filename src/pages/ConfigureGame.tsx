import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AvatarSelector from '@/components/ui/avatar-selector';
import { ArrowLeft, Settings, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AVATAR_OPTIONS, getRandomAvatar } from '@/lib/avatars';
import { useGameManager } from '@/hooks/useGameManager';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import bingoBackground from '@/assets/bingo-bg.jpg';

const ConfigureGame = () => {
  const navigate = useNavigate();
  const { createGame, loading } = useGameManager();
  const { user } = useAuth();
  
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(() => getRandomAvatar().name);
  const [gameSettings, setGameSettings] = useState({
    roundsTotal: 5,
    cardsPerPlayer: 1,
    freeCenter: true,
    maxPlayers: 10, // Fixed at 10, not editable
    visualHints: true
  });

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_name')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setPlayerName(profile.username || '');
        if (profile.avatar_name && profile.avatar_name !== 'default-avatar') {
          setSelectedAvatar(profile.avatar_name);
        }
      }
    } catch (error) {
      console.log('No profile found, using defaults');
    }
  };

  const handleCreateGame = async () => {
    const finalPlayerName = playerName || `Host ${Math.floor(Math.random() * 1000)}`;
    await createGame(finalPlayerName, selectedAvatar, true, gameSettings);
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
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-casino bg-clip-text text-transparent">
              Configure
            </span>
            <span className="text-foreground mx-4">•</span>
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              Game
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Set up your Bingo room preferences and game settings
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Host Profile */}
            <Card className="bg-gradient-room border-primary/20 shadow-casino">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5" />
                  Host Profile
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up your identity as the game host
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName" className="font-semibold">
                    Host Name (Optional)
                  </Label>
                  <Input
                    id="playerName"
                    placeholder="Enter your name or use default"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="bg-card/50 border-primary/20"
                  />
                </div>

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
              </CardContent>
            </Card>

            {/* Game Settings */}
            <Card className="bg-gradient-room border-primary/20 shadow-casino">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Settings className="w-5 h-5" />
                  Game Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure gameplay rules and options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rounds" className="font-semibold">
                    Number of Rounds
                  </Label>
                  <Select 
                    value={gameSettings.roundsTotal.toString()} 
                    onValueChange={(value) => setGameSettings(prev => ({ 
                      ...prev, 
                      roundsTotal: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger className="bg-card/50 border-primary/20">
                      <SelectValue placeholder="Select rounds" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20 z-50">
                      {[3, 4, 5, 6, 7, 8, 9, 10].map((rounds) => (
                        <SelectItem key={rounds} value={rounds.toString()}>
                          {rounds} {rounds === 1 ? 'Round' : 'Rounds'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cards" className="font-semibold">
                    Cards per Player
                  </Label>
                  <Select 
                    value={gameSettings.cardsPerPlayer.toString()} 
                    onValueChange={(value) => setGameSettings(prev => ({ 
                      ...prev, 
                      cardsPerPlayer: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger className="bg-card/50 border-primary/20">
                      <SelectValue placeholder="Select cards" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20 z-50">
                      {[1, 2, 3, 4].map((cards) => (
                        <SelectItem key={cards} value={cards.toString()}>
                          {cards} {cards === 1 ? 'Card' : 'Cards'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="freeCenter" className="font-semibold">
                      Free Center Space
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Center square is automatically marked
                    </p>
                  </div>
                  <Switch
                    id="freeCenter"
                    checked={gameSettings.freeCenter}
                    onCheckedChange={(checked) => setGameSettings(prev => ({ 
                      ...prev, 
                      freeCenter: checked 
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="visualHints" className="font-semibold">
                      Visual Number Hints
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Highlight matching numbers on cards
                    </p>
                  </div>
                  <Switch
                    id="visualHints"
                    checked={gameSettings.visualHints}
                    onCheckedChange={(checked) => setGameSettings(prev => ({ 
                      ...prev, 
                      visualHints: checked 
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Summary */}
          <Card className="mt-6 bg-gradient-electric border-accent/20 shadow-electric">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Trophy className="w-5 h-5" />
                Game Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-accent">{gameSettings.roundsTotal}</p>
                <p className="text-sm text-muted-foreground">Rounds</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{gameSettings.cardsPerPlayer}</p>
                <p className="text-sm text-muted-foreground">Cards Each</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{gameSettings.freeCenter ? 'Yes' : 'No'}</p>
                <p className="text-sm text-muted-foreground">Free Center</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{gameSettings.visualHints ? 'On' : 'Off'}</p>
                <p className="text-sm text-muted-foreground">Visual Hints</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <Button
              onClick={handleCreateGame}
              disabled={loading}
              variant="casino"
              size="xl"
              className="w-full"
            >
              {loading ? 'Creating Game...' : 'Create Game & Enter Lobby'}
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full border-secondary/50 hover:bg-secondary/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigureGame;