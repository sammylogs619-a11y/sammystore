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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      fn_countries: {
        Row: {
          id: string
          code: string
          name: string
          flag_emoji: string
          dial_code: string | null
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          code: string
          name: string
          flag_emoji: string
          dial_code?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          code?: string
          name?: string
          flag_emoji?: string
          dial_code?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      fn_delivery_stats: {
        Row: {
          country_code: string
          service_slug: string
          avg_delivery_seconds: number | null
          sample_size: number | null
        }
        Insert: {
          country_code: string
          service_slug: string
          avg_delivery_seconds?: number | null
          sample_size?: number | null
        }
        Update: {
          country_code?: string
          service_slug?: string
          avg_delivery_seconds?: number | null
          sample_size?: number | null
        }
        Relationships: []
      }
      fn_orders: {
        Row: {
          id: string
          user_id: string
          provider_id: string | null
          country_code: string
          service_slug: string
          phone_number: string | null
          provider_order_id: string | null
          amount_ngn: number
          status: string
          otp_code: string | null
          otp_received_at: string | null
          expires_at: string | null
          cancelled_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider_id?: string | null
          country_code: string
          service_slug: string
          phone_number?: string | null
          provider_order_id?: string | null
          amount_ngn?: number
          status?: string
          otp_code?: string | null
          otp_received_at?: string | null
          expires_at?: string | null
          cancelled_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider_id?: string | null
          country_code?: string
          service_slug?: string
          phone_number?: string | null
          provider_order_id?: string | null
          amount_ngn?: number
          status?: string
          otp_code?: string | null
          otp_received_at?: string | null
          expires_at?: string | null
          cancelled_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fn_pricing_config: {
        Row: {
          id: string
          is_active: boolean
          country_code: string | null
          service_slug: string | null
          margin_percent: number | null
          fixed_markup_ngn: number | null
          override_price_ngn: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          country_code?: string | null
          service_slug?: string | null
          margin_percent?: number | null
          fixed_markup_ngn?: number | null
          override_price_ngn?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          country_code?: string | null
          service_slug?: string | null
          margin_percent?: number | null
          fixed_markup_ngn?: number | null
          override_price_ngn?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fn_providers: {
        Row: {
          id: string
          slug: string
          name: string
          api_base_url: string | null
          is_active: boolean
          priority: number
          balance_usd: number | null
          last_synced: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          api_base_url?: string | null
          is_active?: boolean
          priority?: number
          balance_usd?: number | null
          last_synced?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          api_base_url?: string | null
          is_active?: boolean
          priority?: number
          balance_usd?: number | null
          last_synced?: string | null
        }
        Relationships: []
      }
      fn_provider_inventory: {
        Row: {
          id: string
          provider_id: string
          country_code: string
          service_slug: string
          price_usd: number
          price_ngn: number | null
          stock: number
          is_available: boolean
          synced_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          country_code: string
          service_slug: string
          price_usd: number
          price_ngn?: number | null
          stock?: number
          is_available?: boolean
          synced_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          country_code?: string
          service_slug?: string
          price_usd?: number
          price_ngn?: number | null
          stock?: number
          is_available?: boolean
          synced_at?: string
        }
        Relationships: []
      }
      fn_services: {
        Row: {
          id: string
          slug: string
          name: string
          icon_url: string | null
          category: string | null
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          slug: string
          name: string
          icon_url?: string | null
          category?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          icon_url?: string | null
          category?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      fn_settings: {
        Row: {
          key: string
          value: Json | null
        }
        Insert: {
          key: string
          value?: Json | null
        }
        Update: {
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string | null
        }
        Relationships: []
      }
      bank_transfer_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          reference: string
          sender_name: string
          receipt_url: string | null
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reference: string
          sender_name: string
          receipt_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reference?: string
          sender_name?: string
          receipt_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          delivered_payload: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          title: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          delivered_payload?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          title: string
          unit_price: number
        }
        Update: {
          created_at?: string
          delivered_payload?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          user_id: string
          wallet_tx_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          user_id: string
          wallet_tx_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          user_id?: string
          wallet_tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_wallet_tx_id_fkey"
            columns: ["wallet_tx_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          raw: Json | null
          reference: string
          status: Database["public"]["Enums"]["tx_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          provider: Database["public"]["Enums"]["payment_provider"]
          raw?: Json | null
          reference: string
          status?: Database["public"]["Enums"]["tx_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          raw?: Json | null
          reference?: string
          status?: Database["public"]["Enums"]["tx_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_credentials: {
        Row: {
          assigned_to: string | null
          content: string
          created_at: string
          delivered_at: string | null
          id: string
          label: string | null
          order_id: string | null
          product_id: string
        }
        Insert: {
          assigned_to?: string | null
          content: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          label?: string | null
          order_id?: string | null
          product_id: string
        }
        Update: {
          assigned_to?: string | null
          content?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          label?: string | null
          order_id?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_credentials_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_credentials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          price: number
          published: boolean
          slug: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          price: number
          published?: boolean
          slug: string
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          price?: number
          published?: boolean
          slug?: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount?: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          provider: Database["public"]["Enums"]["payment_provider"] | null
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_credential_to_order: {
        Args: { _order_id: string; _product_id: string }
        Returns: string
      }
      credit_wallet: {
        Args: {
          _amount: number
          _description?: string
          _provider: Database["public"]["Enums"]["payment_provider"]
          _reference: string
          _user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_with_wallet: {
        Args: { _product_id: string; _quantity: number; _user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "user" | "admin"
      order_status: "pending" | "completed" | "failed" | "refunded" | "pending_credentials"
      payment_provider: "paystack" | "nowpayments" | "manual"
      tx_status: "pending" | "success" | "failed" | "reversed" | "submitted"
      tx_type: "credit" | "debit"
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
      app_role: ["user", "admin"],
      order_status: ["pending", "completed", "pending_credentials", "failed", "refunded"],
      payment_provider: ["paystack", "nowpayments", "manual"],
      tx_status: ["pending", "success", "failed", "reversed"],
      tx_type: ["credit", "debit"],
    },
  },
} as const
