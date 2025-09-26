export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bingo_cards: {
        Row: {
          card_number: number
          created_at: string | null
          id: string
          is_winner: boolean | null
          marked_positions: boolean[] | null
          numbers: number[]
          points_earned: number | null
          room_player_id: string | null
          round_id: string | null
        }
        Insert: {
          card_number?: number
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          marked_positions?: boolean[] | null
          numbers: number[]
          points_earned?: number | null
          room_player_id?: string | null
          round_id?: string | null
        }
        Update: {
          card_number?: number
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          marked_positions?: boolean[] | null
          numbers?: number[]
          points_earned?: number | null
          room_player_id?: string | null
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bingo_cards_room_player_id_fkey"
            columns: ["room_player_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bingo_cards_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          cards_per_player: number | null
          created_at: string | null
          current_round_number: number | null
          free_center: boolean | null
          host_id: string | null
          id: string
          max_players: number | null
          room_code: string
          round_start_time: string | null
          rounds_completed: number | null
          rounds_total: number | null
          status: Database["public"]["Enums"]["game_status"] | null
          updated_at: string | null
        }
        Insert: {
          cards_per_player?: number | null
          created_at?: string | null
          current_round_number?: number | null
          free_center?: boolean | null
          host_id?: string | null
          id?: string
          max_players?: number | null
          room_code: string
          round_start_time?: string | null
          rounds_completed?: number | null
          rounds_total?: number | null
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Update: {
          cards_per_player?: number | null
          created_at?: string | null
          current_round_number?: number | null
          free_center?: boolean | null
          host_id?: string | null
          id?: string
          max_players?: number | null
          room_code?: string
          round_start_time?: string | null
          rounds_completed?: number | null
          rounds_total?: number | null
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rounds: {
        Row: {
          current_draw_index: number | null
          draw_sequence: number[] | null
          end_time: string | null
          id: string
          room_id: string | null
          round_number: number
          start_time: string | null
          status: string | null
        }
        Insert: {
          current_draw_index?: number | null
          draw_sequence?: number[] | null
          end_time?: string | null
          id?: string
          room_id?: string | null
          round_number: number
          start_time?: string | null
          status?: string | null
        }
        Update: {
          current_draw_index?: number | null
          draw_sequence?: number[] | null
          end_time?: string | null
          id?: string
          room_id?: string | null
          round_number?: number
          start_time?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      match_history: {
        Row: {
          completed_at: string | null
          final_placement: number | null
          id: string
          profile_id: string | null
          room_code: string
          rounds_played: number | null
          total_points: number | null
        }
        Insert: {
          completed_at?: string | null
          final_placement?: number | null
          id?: string
          profile_id?: string | null
          room_code: string
          rounds_played?: number | null
          total_points?: number | null
        }
        Update: {
          completed_at?: string | null
          final_placement?: number | null
          id?: string
          profile_id?: string | null
          room_code?: string
          rounds_played?: number | null
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_name: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_name?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_name?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      room_players: {
        Row: {
          avatar_name: string | null
          id: string
          is_anonymous: boolean | null
          joined_at: string | null
          player_name: string
          profile_id: string | null
          role: Database["public"]["Enums"]["player_role"] | null
          room_id: string | null
          total_score: number | null
        }
        Insert: {
          avatar_name?: string | null
          id?: string
          is_anonymous?: boolean | null
          joined_at?: string | null
          player_name: string
          profile_id?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          room_id?: string | null
          total_score?: number | null
        }
        Update: {
          avatar_name?: string | null
          id?: string
          is_anonymous?: boolean | null
          joined_at?: string | null
          player_name?: string
          profile_id?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          room_id?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      round_scores: {
        Row: {
          bingo_achieved: boolean | null
          corners_bonus: boolean | null
          created_at: string | null
          id: string
          lines_completed: number | null
          multi_card_bonus: number | null
          points_earned: number | null
          room_player_id: string | null
          round_id: string | null
        }
        Insert: {
          bingo_achieved?: boolean | null
          corners_bonus?: boolean | null
          created_at?: string | null
          id?: string
          lines_completed?: number | null
          multi_card_bonus?: number | null
          points_earned?: number | null
          room_player_id?: string | null
          round_id?: string | null
        }
        Update: {
          bingo_achieved?: boolean | null
          corners_bonus?: boolean | null
          created_at?: string | null
          id?: string
          lines_completed?: number | null
          multi_card_bonus?: number | null
          points_earned?: number | null
          room_player_id?: string | null
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_scores_room_player_id_fkey"
            columns: ["room_player_id"]
            isOneToOne: false
            referencedRelation: "room_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_room_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      game_status: "waiting" | "in_progress" | "finished"
      player_role: "host" | "player"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      game_status: ["waiting", "in_progress", "finished"],
      player_role: ["host", "player"],
    },
  },
} as const
