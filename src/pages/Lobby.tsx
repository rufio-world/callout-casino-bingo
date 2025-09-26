import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import GameLobby from '@/components/game/GameLobby';
import { GameRoom, RoomPlayer } from '@/types/game';
import { useToast } from '@/hooks/use-toast';
import { generateBingoCard } from '@/lib/bingo';

const Lobby = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<RoomPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    loadRoomData();
  }, [roomCode, navigate]);

  useEffect(() => {
    if (!room) return;

    // Set up real-time subscriptions for players and room updates
    const playersChannel = supabase
      .channel(`room-players-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('Players changed:', payload);
          loadRoomData();
        }
      )
      .subscribe();

    const roomChannel = supabase
      .channel(`game-room-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${roomCode}`
        },
        (payload) => {
          if (payload.new.status === 'in_progress') {
            navigate(`/game/${roomCode}`);
          } else {
            setRoom(payload.new as GameRoom);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [room, roomCode, navigate]);

  const loadRoomData = async () => {
    try {
      // Load room data
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError) {
        console.error('Room error:', roomError);
        toast({
          title: "Room not found",
          description: "The room code you entered doesn't exist.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setRoom(roomData);

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersError) {
        console.error('Players error:', playersError);
        return;
      }

      setPlayers(playersData || []);
      
      // For demo purposes, set the first player as current player
      // In a real app, this would be based on authentication
      if (playersData && playersData.length > 0) {
        setCurrentPlayer(playersData[0]);
      }

    } catch (error) {
      console.error('Error loading room:', error);
      toast({
        title: "Error",
        description: "Failed to load room data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = async () => {
    if (!room || !currentPlayer) return;

    try {
      // Call game controller edge function to start the game
      const { error } = await supabase.functions.invoke('game-controller', {
        body: { 
          action: 'start_game',
          roomCode: room.room_code
        }
      });

      if (error) {
        console.error('Error starting game:', error);
        toast({
          title: "Error",
          description: "Failed to start the game.",
          variant: "destructive",
        });
        return;
      }
      
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error",
        description: "Failed to start the game.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const handleUpdateSettings = async (settings: Partial<GameRoom>) => {
    if (!room) return;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update(settings)
        .eq('id', room.id);

      if (error) {
        console.error('Error updating settings:', error);
        return;
      }

      setRoom(prev => prev ? { ...prev, ...settings } : null);
      
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-room flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-room flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Room Not Found</h1>
          <p className="text-muted-foreground mb-4">The room you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const isHost = currentPlayer.role === 'host';

  return (
    <GameLobby
      room={room}
      players={players}
      currentPlayer={currentPlayer}
      isHost={isHost}
      onGameStart={handleGameStart}
      onLeaveRoom={handleLeaveRoom}
      onUpdateSettings={handleUpdateSettings}
    />
  );
};

export default Lobby;