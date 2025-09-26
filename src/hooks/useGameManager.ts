import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRoomCode } from '@/lib/bingo';
import { GameRoom } from '@/types/game';

export const useGameManager = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createGame = async (playerName: string, avatarName: string, isHost = true) => {
    setLoading(true);
    
    try {
      // For demo purposes, we'll create a simple room and navigate to it
      // In a real app, this would create actual database records
      
      const roomCode = generateRoomCode();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      // For demo purposes, we'll just navigate to the lobby
      // In a real app, this would validate the room code and add the player
      
      if (roomCode.length !== 5) {
        toast({
          title: "Invalid Room Code",
          description: "Room code must be exactly 5 characters.",
          variant: "destructive",
        });
        return;
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
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