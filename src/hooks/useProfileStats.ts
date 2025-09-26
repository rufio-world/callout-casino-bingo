import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfileStats {
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  totalBingos: number;
  totalLines: number;
  bestPlacement: number | null;
}

export const useProfileStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        setStats({
          gamesPlayed: 0,
          gamesWon: 0,
          totalPoints: 0,
          totalBingos: 0,
          totalLines: 0,
          bestPlacement: null,
        });
        return;
      }

      // Fetch match history for basic stats
      const { data: matchHistory, error: matchError } = await supabase
        .from('match_history')
        .select('*')
        .eq('profile_id', profile.id);

      if (matchError) {
        console.error('Error fetching match history:', matchError);
        return;
      }

      // Calculate basic stats from match history
      const gamesPlayed = matchHistory?.length || 0;
      const gamesWon = matchHistory?.filter(match => match.final_placement === 1).length || 0;
      const totalPoints = matchHistory?.reduce((sum, match) => sum + (match.total_points || 0), 0) || 0;
      const bestPlacement = matchHistory?.length > 0
        ? Math.min(...matchHistory.map(match => match.final_placement || Infinity).filter(p => p !== Infinity))
        : null;

      // Fetch detailed round scores for bingo and line stats
      const { data: roundScores, error: scoresError } = await supabase
        .from('round_scores')
        .select(`
          *,
          room_player_id!inner (
            profile_id
          )
        `)
        .eq('room_player_id.profile_id', profile.id);

      if (scoresError) {
        console.error('Error fetching round scores:', scoresError);
      }

      const totalBingos = roundScores?.reduce((sum, score) => 
        sum + (score.bingo_achieved ? 1 : 0), 0) || 0;
      const totalLines = roundScores?.reduce((sum, score) => 
        sum + (score.lines_completed || 0), 0) || 0;

      setStats({
        gamesPlayed,
        gamesWon,
        totalPoints,
        totalBingos,
        totalLines,
        bestPlacement: bestPlacement === Infinity ? null : bestPlacement,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        totalBingos: 0,
        totalLines: 0,
        bestPlacement: null,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    refetch: fetchStats,
  };
};