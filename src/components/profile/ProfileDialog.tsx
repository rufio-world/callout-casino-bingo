import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AvatarSelector from '@/components/ui/avatar-selector';
import { User, Settings, TrendingUp, Trophy, Target, Zap, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useProfileStats } from '@/hooks/useProfileStats';
import { toast } from '@/hooks/use-toast';
import { getAvatarByName } from '@/lib/avatars';

interface ProfileDialogProps {
  trigger?: React.ReactNode;
}

export const ProfileDialog = ({ trigger }: ProfileDialogProps) => {
  const { user } = useAuth();
  const { profile, updateProfile, changePassword, loading } = useProfile();
  const { stats, loading: statsLoading } = useProfileStats();
  
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setSelectedAvatar(profile.avatar_name);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const success = await updateProfile({
      username: username.trim(),
      avatar_name: selectedAvatar,
    });

    if (success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    const success = await changePassword(currentPassword, newPassword);
    
    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
    }
  };

  const currentAvatar = getAvatarByName(selectedAvatar);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="bg-transparent border-primary/20 hover:bg-primary/10">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-room border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-gold bg-clip-text text-transparent flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Player Profile
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-primary/20">
              <Trophy className="w-4 h-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-card/50 border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-20 h-20 bg-gradient-casino rounded-full flex items-center justify-center text-4xl">
                  {currentAvatar?.image || '👤'}
                </div>
                <CardTitle className="text-xl text-foreground">
                  {profile?.username || 'Loading...'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {user?.email}
                </CardDescription>
              </CardHeader>
            </Card>

            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-casino/10 border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {stats.gamesPlayed}
                    </div>
                    <div className="text-sm text-muted-foreground">Games Played</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-gold/10 border-secondary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-secondary mb-2">
                      {stats.totalPoints}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Profile Settings</CardTitle>
                <CardDescription>Update your username and avatar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                    className="bg-card/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <AvatarSelector
                    selectedAvatar={selectedAvatar}
                    onAvatarSelect={setSelectedAvatar}
                    trigger={
                      <Button variant="outline" className="w-full bg-card/50 h-12">
                        <span className="text-2xl mr-3">
                          {currentAvatar?.image || '👤'}
                        </span>
                        <span className="flex-1">{selectedAvatar || 'Choose Avatar'}</span>
                      </Button>
                    }
                  />
                </div>

                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={loading}
                  className="w-full"
                  variant="casino"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-card/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-card/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-card/50"
                  />
                </div>

                <Button 
                  onClick={handleChangePassword} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {statsLoading ? (
              <div className="text-center text-muted-foreground">Loading statistics...</div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-casino/10 border-primary/20">
                    <CardContent className="pt-6 text-center">
                      <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-primary mb-1">
                        {stats.gamesWon}
                      </div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-electric/10 border-accent/20">
                    <CardContent className="pt-6 text-center">
                      <Target className="w-8 h-8 text-accent mx-auto mb-2" />
                      <div className="text-2xl font-bold text-accent mb-1">
                        {stats.totalBingos}
                      </div>
                      <div className="text-sm text-muted-foreground">Bingos</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-gold/10 border-secondary/20">
                    <CardContent className="pt-6 text-center">
                      <Zap className="w-8 h-8 text-secondary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-secondary mb-1">
                        {stats.totalLines}
                      </div>
                      <div className="text-sm text-muted-foreground">Lines</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card/50 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-semibold">
                        {stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Average Points per Game</span>
                      <span className="font-semibold">
                        {stats.gamesPlayed > 0 ? Math.round(stats.totalPoints / stats.gamesPlayed) : 0}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Games</span>
                      <span className="font-semibold">{stats.gamesPlayed}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Best Placement</span>
                      <span className="font-semibold">
                        {stats.bestPlacement ? `#${stats.bestPlacement}` : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No statistics available yet.</p>
                <p className="text-sm">Play some games to see your stats!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};