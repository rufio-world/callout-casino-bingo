import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useGameManager = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createGame = async (playerName: string, avatarName: string, isHost = true) => {
    setLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to create a game.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if user has a profile, create one if not
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username: playerName,
            avatar_name: avatarName
          })
          .select()
          .single();

        if (profileError) throw profileError;
        profile = newProfile;
      }

      // Generate room code using database function
      const { data: roomCodeData, error: codeError } = await supabase
        .rpc('generate_room_code');

      if (codeError) throw codeError;
      const roomCode = roomCodeData;

      // Create the game room
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          host_id: profile.id,
          status: 'waiting'
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add the host as a player
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          profile_id: profile.id,
          player_name: playerName,
          avatar_name: avatarName,
          role: 'host'
        });

      if (playerError) throw playerError;
      
      toast({
        title: "Game Created!",
        description: `Room code: ${roomCode}`,
      });
      
      // Navigate to lobby
      navigate(`/lobby/${roomCode}`);
      
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (roomCode: string, playerName: string, avatarName: string) => {
    setLoading(true);
    
    try {
      if (roomCode.length !== 5) {
        toast({
          title: "Invalid Room Code",
          description: "Room code must be exactly 5 characters.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to join a game.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if room exists
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        toast({
          title: "Room Not Found",
          description: "The room code you entered doesn't exist or is no longer accepting players.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if user has a profile, create one if not
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username: playerName,
            avatar_name: avatarName
          })
          .select()
          .single();

        if (profileError) throw profileError;
        profile = newProfile;
      }

      // Check if room is full
      const { count } = await supabase
        .from('room_players')
        .select('*', { count: 'exact' })
        .eq('room_id', room.id);

      if (count && count >= room.max_players) {
        toast({
          title: "Room Full",
          description: "This room is already full.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Add player to room
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          profile_id: profile.id,
          player_name: playerName,
          avatar_name: avatarName,
          role: 'player'
        });

      if (playerError) throw playerError;
      
      toast({
        title: "Joined Game!",
        description: `Welcome to room ${roomCode}`,
      });
      
      // Navigate to lobby
      navigate(`/lobby/${roomCode}`);
      
    } catch (error) {
      console.error('Error joining game:', error);
      toast({
        title: "Error",
        description: "Failed to join game. Please check the room code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    createGame,
    joinGame,
    loading
  };
};