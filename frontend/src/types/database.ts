export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      places: {
        Row: {
          id: string;
          content_id: string;
          content_type: number;
          name_ko: string;
          name_en: string | null;
          name_ja: string | null;
          name_zh: string | null;
          lat: number;
          lng: number;
          address: string | null;
          category: string | null;
          image_url: string | null;
          crowd_level: number | null;
          crowd_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['places']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['places']['Insert']>;
      };
      sns_analysis: {
        Row: {
          id: string;
          url_hash: string;
          source_url: string;
          detected_place_id: string | null;
          vibe_tags: string[];
          raw_result: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sns_analysis']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['sns_analysis']['Insert']>;
      };
      user_personas: {
        Row: {
          id: string;
          user_id: string;
          star_name: string | null;
          mood_tags: string[];
          style_tags: string[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_personas']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_personas']['Insert']>;
      };
      routes: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string | null;
          place_ids: string[];
          estimated_time: number | null;
          total_distance: number | null;
          share_token: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['routes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['routes']['Insert']>;
      };
      facilities: {
        Row: {
          id: string;
          type: 'restroom' | 'cafe_toilet' | 'pharmacy';
          name: string;
          address: string | null;
          lat: number;
          lng: number;
          is_public: boolean;
          is_24h: boolean;
          languages: string[];
          source: string;
        };
        Insert: Omit<Database['public']['Tables']['facilities']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['facilities']['Insert']>;
      };
    };
  };
}
