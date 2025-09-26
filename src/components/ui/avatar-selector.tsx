import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/types/game';
import { AVATAR_OPTIONS, getAvatarsByCategory } from '@/lib/avatars';
import { Search, Users, Sparkles, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarSelectorProps {
  selectedAvatar: string;
  onAvatarSelect: (avatarName: string) => void;
  trigger?: React.ReactNode;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onAvatarSelect,
  trigger
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Avatar['category'] | 'All'>('All');
  const [isOpen, setIsOpen] = useState(false);

  const categories = ['All', 'Animals', 'Mythical', 'People', 'Objects'] as const;
  
  const categoryIcons = {
    All: Zap,
    Animals: Users,
    Mythical: Sparkles,
    People: Users,
    Objects: Crown
  };

  const filteredAvatars = AVATAR_OPTIONS.filter(avatar => {
    const matchesSearch = avatar.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || avatar.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAvatarSelect = (avatarName: string) => {
    onAvatarSelect(avatarName);
    setIsOpen(false);
  };

  const currentAvatar = AVATAR_OPTIONS.find(a => a.name === selectedAvatar);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="bg-card hover:bg-accent">
            <span className="text-2xl mr-2">{currentAvatar?.image || '👤'}</span>
            Choose Avatar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-gradient-room border-primary/20 max-w-2xl max-h-[80vh] overflow-hidden" aria-describedby="avatar-selector-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
            Choose Your Avatar
          </DialogTitle>
          <div id="avatar-selector-description" className="sr-only">
            Select an avatar from the categories below to represent yourself in the game
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search avatars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50 border-primary/20"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    selectedCategory === category 
                      ? "bg-gradient-casino text-primary-foreground shadow-casino" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => setSelectedCategory(category)}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {category}
                  {category !== 'All' && (
                    <span className="ml-1 text-xs opacity-70">
                      ({getAvatarsByCategory(category as Avatar['category']).length})
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>

          {/* Avatar Grid */}
          <div className="grid grid-cols-6 gap-3 max-h-64 overflow-y-auto pr-2">
            {filteredAvatars.map((avatar) => (
              <button
                key={avatar.name}
                onClick={() => handleAvatarSelect(avatar.name)}
                className={cn(
                  "relative p-3 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-gold",
                  "bg-card/50 hover:bg-accent",
                  selectedAvatar === avatar.name
                    ? "border-secondary shadow-gold bg-secondary/10"
                    : "border-border hover:border-secondary/50"
                )}
                title={avatar.name}
              >
                <div className="text-3xl mb-1">{avatar.image}</div>
                <div className="text-xs font-medium text-foreground/80 truncate">
                  {avatar.name}
                </div>
                {selectedAvatar === avatar.name && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-background" />
                )}
              </button>
            ))}
          </div>

          {filteredAvatars.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <span className="text-4xl mb-2 block">🔍</span>
              No avatars found matching your search.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarSelector;