export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null; province: string | null; city: string | null; address: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; avatar_url?: string | null; phone?: string | null; province?: string | null; city?: string | null; address?: string | null };
        Update: { full_name?: string | null; avatar_url?: string | null; phone?: string | null; province?: string | null; city?: string | null; address?: string | null };
      };
      user_roles: {
        Row: { id: string; user_id: string; role: "admin" | "moderator" | "user" };
        Insert: { user_id: string; role?: "admin" | "moderator" | "user" };
        Update: { role?: "admin" | "moderator" | "user" };
      };
      categories: {
        Row: { id: string; name: string; slug: string; icon: string | null; image_url: string | null; cover_image_url: string | null; color: string | null; parent_id: string | null; sort_order: number; is_active: boolean; created_at: string };
        Insert: { name: string; slug: string; icon?: string | null; image_url?: string | null; cover_image_url?: string | null; color?: string | null; parent_id?: string | null; sort_order?: number; is_active?: boolean };
        Update: { name?: string; slug?: string; icon?: string | null; image_url?: string | null; cover_image_url?: string | null; color?: string | null; parent_id?: string | null; sort_order?: number; is_active?: boolean };
      };
      sellers: {
        Row: { id: string; user_id: string; type: "individual" | "company"; name: string; slug: string | null; description: string | null; logo_url: string | null; cover_url: string | null; phone: string | null; whatsapp: string | null; email: string | null; province: string | null; city: string | null; address: string | null; website: string | null; rating: number; total_reviews: number; total_sales: number; followers_count: number; visits_count: number; is_verified: boolean; is_active: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; type?: "individual" | "company"; name: string; slug?: string | null; description?: string | null; logo_url?: string | null; cover_url?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; province?: string | null; city?: string | null; address?: string | null; website?: string | null };
        Update: { name?: string; slug?: string | null; description?: string | null; logo_url?: string | null; cover_url?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; province?: string | null; city?: string | null; address?: string | null; website?: string | null; is_verified?: boolean; is_active?: boolean };
      };
      companies: {
        Row: { id: string; name: string; slug: string; description: string | null; logo_url: string | null; banner_url: string | null; phone: string | null; email: string | null; website: string | null; address: string | null; province: string | null; nif: string | null; is_verified: boolean; verified_at: string | null; is_active: boolean; rating: number; total_sales: number; created_by: string | null; created_at: string; updated_at: string };
        Insert: { name: string; slug: string; description?: string | null; logo_url?: string | null; banner_url?: string | null; phone?: string | null; email?: string | null; website?: string | null; address?: string | null; province?: string | null; nif?: string | null; created_by?: string | null };
        Update: { name?: string; slug?: string; description?: string | null; logo_url?: string | null; is_verified?: boolean; verified_at?: string | null; is_active?: boolean };
      };
      company_members: {
        Row: { id: string; company_id: string; user_id: string; role: "owner" | "manager" | "editor" | "viewer"; added_by: string | null; created_at: string };
        Insert: { company_id: string; user_id: string; role?: "owner" | "manager" | "editor" | "viewer"; added_by?: string | null };
        Update: { role?: "owner" | "manager" | "editor" | "viewer" };
      };
      seller_applications: {
        Row: { id: string; user_id: string; name: string; phone: string | null; province: string | null; bio: string | null; status: "pending" | "approved" | "rejected"; reviewed_by: string | null; reviewed_at: string | null; created_at: string };
        Insert: { user_id: string; name: string; phone?: string | null; province?: string | null; bio?: string | null };
        Update: { status?: "pending" | "approved" | "rejected"; reviewed_by?: string | null; reviewed_at?: string | null };
      };
      products: {
        Row: { id: string; seller_id: string; company_id: string | null; category_id: string | null; title: string; description: string | null; price: number; old_price: number | null; discount_percent: number | null; currency: string; stock: number; sku: string | null; condition: string; province: string | null; city: string | null; free_shipping: boolean; badge: string | null; rating: number; total_reviews: number; views_count: number; sales_count: number; is_active: boolean; is_featured: boolean; created_at: string; updated_at: string };
        Insert: { seller_id: string; company_id?: string | null; category_id?: string | null; title: string; description?: string | null; price: number; old_price?: number | null; discount_percent?: number | null; stock?: number; free_shipping?: boolean; badge?: string | null };
        Update: { title?: string; description?: string | null; price?: number; old_price?: number | null; discount_percent?: number | null; stock?: number; free_shipping?: boolean; badge?: string | null; is_active?: boolean; is_featured?: boolean };
      };
      favorites: {
        Row: { id: string; user_id: string; product_id: string; created_at: string };
        Insert: { user_id: string; product_id: string };
        Update: never;
      };
      cart_items: {
        Row: { id: string; user_id: string; product_id: string; variant_id: string | null; quantity: number; created_at: string; updated_at: string };
        Insert: { user_id: string; product_id: string; variant_id?: string | null; quantity?: number };
        Update: { quantity?: number };
      };
      orders: {
        Row: { id: string; order_number: string; user_id: string; seller_id: string; status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"; subtotal: number; shipping_cost: number; discount_amount: number; total: number; shipping_name: string | null; shipping_phone: string | null; shipping_province: string | null; shipping_city: string | null; shipping_address: string | null; tracking_code: string | null; notes: string | null; created_at: string; updated_at: string };
        Insert: { user_id: string; seller_id: string; subtotal: number; total: number };
        Update: { status?: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"; tracking_code?: string | null };
      };
      order_items: {
        Row: { id: string; order_id: string; product_id: string; variant_id: string | null; title: string; price: number; quantity: number; image_url: string | null; created_at: string };
        Insert: { order_id: string; product_id: string; title: string; price: number; quantity?: number; image_url?: string | null };
        Update: never;
      };
      auctions: {
        Row: { id: string; product_id: string; seller_id: string; title: string; description: string | null; image_url: string | null; starting_price: number; current_price: number; min_increment: number; status: "upcoming" | "active" | "ended" | "cancelled"; total_bids: number; participants_count: number; starts_at: string; ends_at: string; created_at: string };
        Insert: { product_id: string; seller_id: string; title: string; starting_price: number; current_price: number; starts_at: string; ends_at: string };
        Update: { current_price?: number; status?: "upcoming" | "active" | "ended" | "cancelled"; total_bids?: number };
      };
      live_streams: {
        Row: { id: string; seller_id: string; title: string; description: string | null; thumbnail_url: string | null; stream_url: string | null; status: "scheduled" | "live" | "ended"; viewers_count: number; starts_at: string | null; ended_at: string | null; created_at: string };
        Insert: { seller_id: string; title: string; starts_at?: string | null };
        Update: { status?: "scheduled" | "live" | "ended"; viewers_count?: number };
      };
      promotions: {
        Row: { id: string; title: string; description: string | null; type: "regular" | "flash"; discount_percent: number | null; banner_url: string | null; starts_at: string; ends_at: string; is_active: boolean; created_at: string };
        Insert: { title: string; starts_at: string; ends_at: string; type?: "regular" | "flash" };
        Update: { title?: string; is_active?: boolean };
      };
      notifications: {
        Row: { id: string; user_id: string; title: string; message: string | null; type: string; link_url: string | null; is_read: boolean; created_at: string };
        Insert: { user_id: string; title: string; message?: string | null; type?: string };
        Update: { is_read?: boolean };
      };
      conversations: {
        Row: { id: string; buyer_id: string; seller_id: string; product_id: string | null; last_message: string | null; last_message_at: string; created_at: string };
        Insert: { buyer_id: string; seller_id: string; product_id?: string | null };
        Update: { last_message?: string | null; last_message_at?: string };
      };
      messages: {
        Row: { id: string; conversation_id: string; sender_id: string; content: string; image_url: string | null; is_read: boolean; created_at: string };
        Insert: { conversation_id: string; sender_id: string; content: string };
        Update: { is_read?: boolean };
      };
      product_media: {
        Row: { id: string; product_id: string; url: string; type: string; is_cover: boolean; sort_order: number; created_at: string };
        Insert: { product_id: string; url: string; type?: string; is_cover?: boolean; sort_order?: number };
        Update: { url?: string; type?: string; is_cover?: boolean; sort_order?: number };
      };
      site_settings: {
        Row: { id: string; key: string; value: string | null; updated_at: string };
        Insert: { key: string; value?: string | null };
        Update: { value?: string | null; updated_at?: string };
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      company_role: "owner" | "manager" | "editor" | "viewer";
      order_status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
      seller_type: "individual" | "company";
      auction_status: "upcoming" | "active" | "ended" | "cancelled";
      live_status: "scheduled" | "live" | "ended";
      promo_type: "regular" | "flash";
      ad_placement: "home_wide" | "home_double" | "category" | "search" | "product_detail";
    };
  };
};
