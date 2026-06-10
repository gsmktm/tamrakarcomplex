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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          id: string
          name: string
          price: number
          status: string | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          id?: string
          name: string
          price: number
          status?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          status?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      accessory_compatibility: {
        Row: {
          accessory_id: string | null
          compatibility_type: string | null
          created_at: string
          id: string
          model_id: string | null
        }
        Insert: {
          accessory_id?: string | null
          compatibility_type?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
        }
        Update: {
          accessory_id?: string | null
          compatibility_type?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessory_compatibility_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessory_compatibility_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string
          category: Database["public"]["Enums"]["article_category"]
          category_label: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured: boolean | null
          id: string
          image: string | null
          published: boolean | null
          read_time: string | null
          slug: string
          source_site: string | null
          source_url: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          author?: string
          category?: Database["public"]["Enums"]["article_category"]
          category_label?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          id?: string
          image?: string | null
          published?: boolean | null
          read_time?: string | null
          slug: string
          source_site?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          author?: string
          category?: Database["public"]["Enums"]["article_category"]
          category_label?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          id?: string
          image?: string | null
          published?: boolean | null
          read_time?: string | null
          slug?: string
          source_site?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      auto_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          meta_description: string | null
          model_id: string | null
          page_type: string
          slug: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          model_id?: string | null
          page_type: string
          slug: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          model_id?: string | null
          page_type?: string
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_pages_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo: string | null
          name: string
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo?: string | null
          name: string
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo?: string | null
          name?: string
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cache_invalidations: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string | null
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number | null
        }
        Insert: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
        }
        Update: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_config: {
        Row: {
          id: string
          is_active: boolean | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      click_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          product_id: string | null
          source_page: string | null
          store_id: string | null
          user_ip: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          product_id?: string | null
          source_page?: string | null
          store_id?: string | null
          user_ip?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          product_id?: string | null
          source_page?: string | null
          store_id?: string | null
          user_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "click_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          article_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          category: string
          created_at: string
          id: string
          product1_id: string | null
          product2_id: string | null
          view_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          product1_id?: string | null
          product2_id?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          product1_id?: string | null
          product2_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_product1_id_fkey"
            columns: ["product1_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_product2_id_fkey"
            columns: ["product2_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      emi_inquiries: {
        Row: {
          admin_note: string | null
          created_at: string
          customer_name: string
          down_payment: string | null
          email: string | null
          id: string
          message: string | null
          phone: string
          preferred_plan: string | null
          product_id: string | null
          product_interest: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          customer_name: string
          down_payment?: string | null
          email?: string | null
          id?: string
          message?: string | null
          phone: string
          preferred_plan?: string | null
          product_id?: string | null
          product_interest?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          customer_name?: string
          down_payment?: string | null
          email?: string | null
          id?: string
          message?: string | null
          phone?: string
          preferred_plan?: string | null
          product_id?: string | null
          product_interest?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emi_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emi_inquiries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      emi_plans: {
        Row: {
          bank_name: string
          created_at: string | null
          duration_months: number
          id: string
          interest_rate: number | null
          processing_fee: number | null
          status: string | null
        }
        Insert: {
          bank_name: string
          created_at?: string | null
          duration_months: number
          id?: string
          interest_rate?: number | null
          processing_fee?: number | null
          status?: string | null
        }
        Update: {
          bank_name?: string
          created_at?: string | null
          duration_months?: number
          id?: string
          interest_rate?: number | null
          processing_fee?: number | null
          status?: string | null
        }
        Relationships: []
      }
      exchange_values: {
        Row: {
          admin_note: string | null
          condition_grade: string
          created_at: string
          id: string
          max_value: number
          min_value: number
          model_id: string | null
          status: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          admin_note?: string | null
          condition_grade: string
          created_at?: string
          id?: string
          max_value: number
          min_value: number
          model_id?: string | null
          status?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          admin_note?: string | null
          condition_grade?: string
          created_at?: string
          id?: string
          max_value?: number
          min_value?: number
          model_id?: string | null
          status?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_values_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "phone_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_scores: {
        Row: {
          battery_score: number | null
          camera_score: number | null
          created_at: string | null
          design_score: number | null
          display_score: number | null
          id: string
          model_id: string | null
          performance_score: number | null
          review_post_slug: string | null
          software_score: number | null
          updated_at: string | null
          value_score: number | null
        }
        Insert: {
          battery_score?: number | null
          camera_score?: number | null
          created_at?: string | null
          design_score?: number | null
          display_score?: number | null
          id?: string
          model_id?: string | null
          performance_score?: number | null
          review_post_slug?: string | null
          software_score?: number | null
          updated_at?: string | null
          value_score?: number | null
        }
        Update: {
          battery_score?: number | null
          camera_score?: number | null
          created_at?: string | null
          design_score?: number | null
          display_score?: number | null
          id?: string
          model_id?: string | null
          performance_score?: number | null
          review_post_slug?: string | null
          software_score?: number | null
          updated_at?: string | null
          value_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_scores_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          author: string
          category: string
          content: string | null
          created_at: string
          excerpt: string | null
          featured: boolean | null
          guide_type: string
          id: string
          image: string | null
          published: boolean | null
          read_time: string | null
          slug: string
          source_site: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          guide_type?: string
          id?: string
          image?: string | null
          published?: boolean | null
          read_time?: string | null
          slug: string
          source_site?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          guide_type?: string
          id?: string
          image?: string | null
          published?: boolean | null
          read_time?: string | null
          slug?: string
          source_site?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          model_id: string | null
          price: number
          status: string | null
          stock_quantity: number | null
          store_id: string
          updated_at: string
          variant_id: string | null
          warranty: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
          price: number
          status?: string | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
          variant_id?: string | null
          warranty?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
          price?: number
          status?: string | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string
          variant_id?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "phone_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      model_emi: {
        Row: {
          created_at: string | null
          down_payment: number | null
          emi_plan_id: string | null
          id: string
          model_id: string | null
          monthly_amount: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          down_payment?: number | null
          emi_plan_id?: string | null
          id?: string
          model_id?: string | null
          monthly_amount: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          down_payment?: number | null
          emi_plan_id?: string | null
          id?: string
          model_id?: string | null
          monthly_amount?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_emi_emi_plan_id_fkey"
            columns: ["emi_plan_id"]
            isOneToOne: false
            referencedRelation: "emi_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_emi_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_emi_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "phone_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      model_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          model_id: string | null
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          model_id?: string | null
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          model_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_images_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_user_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          model_id: string | null
          rating: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_user_reviews_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_rate_limits: {
        Row: {
          attempt_count: number
          first_attempt_at: string
          id: string
          ip_address: string
          last_attempt_at: string
        }
        Insert: {
          attempt_count?: number
          first_attempt_at?: string
          id?: string
          ip_address: string
          last_attempt_at?: string
        }
        Update: {
          attempt_count?: number
          first_attempt_at?: string
          id?: string
          ip_address?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          product_name: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          product_name?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
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
          contact_info: Json | null
          created_at: string | null
          id: string
          payment_method: string | null
          payment_status: string | null
          shipping_address: Json | null
          status: string | null
          total_amount: number
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      phone_models: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          image: string | null
          is_featured: boolean | null
          is_top_rated: boolean | null
          is_upcoming: boolean | null
          launch_date_nepal: string | null
          market_status: string | null
          model_number: string | null
          name: string
          overview_content: string | null
          release_year: number | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          series_id: string | null
          slug: string
          status: string | null
          updated_at: string
          user_rating_avg: number | null
          user_rating_count: number | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          image?: string | null
          is_featured?: boolean | null
          is_top_rated?: boolean | null
          is_upcoming?: boolean | null
          launch_date_nepal?: string | null
          market_status?: string | null
          model_number?: string | null
          name: string
          overview_content?: string | null
          release_year?: number | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          series_id?: string | null
          slug: string
          status?: string | null
          updated_at?: string
          user_rating_avg?: number | null
          user_rating_count?: number | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          image?: string | null
          is_featured?: boolean | null
          is_top_rated?: boolean | null
          is_upcoming?: boolean | null
          launch_date_nepal?: string | null
          market_status?: string | null
          model_number?: string | null
          name?: string
          overview_content?: string | null
          release_year?: number | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          series_id?: string | null
          slug?: string
          status?: string | null
          updated_at?: string
          user_rating_avg?: number | null
          user_rating_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_models_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "phone_series"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_series: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          name: string
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_series_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_specs: {
        Row: {
          battery: string | null
          body: string | null
          camera: string | null
          charging: string | null
          cons: string[] | null
          created_at: string
          display: string | null
          expert_rating: number | null
          full_specs_json: Json | null
          highlights: Json | null
          id: string
          key_specs: Json | null
          model_id: string | null
          network: string | null
          os: string | null
          processor: string | null
          pros: string[] | null
          updated_at: string
          verdict: string | null
        }
        Insert: {
          battery?: string | null
          body?: string | null
          camera?: string | null
          charging?: string | null
          cons?: string[] | null
          created_at?: string
          display?: string | null
          expert_rating?: number | null
          full_specs_json?: Json | null
          highlights?: Json | null
          id?: string
          key_specs?: Json | null
          model_id?: string | null
          network?: string | null
          os?: string | null
          processor?: string | null
          pros?: string[] | null
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          battery?: string | null
          body?: string | null
          camera?: string | null
          charging?: string | null
          cons?: string[] | null
          created_at?: string
          display?: string | null
          expert_rating?: number | null
          full_specs_json?: Json | null
          highlights?: Json | null
          id?: string
          key_specs?: Json | null
          model_id?: string | null
          network?: string | null
          os?: string | null
          processor?: string | null
          pros?: string[] | null
          updated_at?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_specs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_variant_prices: {
        Row: {
          buy_url: string | null
          created_at: string | null
          currency: string | null
          emi_available: boolean | null
          id: string
          is_default: boolean | null
          model_id: string | null
          regular_price: number
          retailer_id: string | null
          sale_price: number | null
          sort_order: number | null
          stock_status: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          buy_url?: string | null
          created_at?: string | null
          currency?: string | null
          emi_available?: boolean | null
          id?: string
          is_default?: boolean | null
          model_id?: string | null
          regular_price: number
          retailer_id?: string | null
          sale_price?: number | null
          sort_order?: number | null
          stock_status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          buy_url?: string | null
          created_at?: string | null
          currency?: string | null
          emi_available?: boolean | null
          id?: string
          is_default?: boolean | null
          model_id?: string | null
          regular_price?: number
          retailer_id?: string | null
          sale_price?: number | null
          sort_order?: number | null
          stock_status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_variant_prices_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_variant_prices_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_variant_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "phone_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_variants: {
        Row: {
          color: string | null
          condition_type: string | null
          created_at: string
          id: string
          model_id: string | null
          ram: string | null
          region: string | null
          status: string | null
          storage: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          condition_type?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
          ram?: string | null
          region?: string | null
          status?: string | null
          storage?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          condition_type?: string | null
          created_at?: string
          id?: string
          model_id?: string | null
          ram?: string | null
          region?: string | null
          status?: string | null
          storage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_variants_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          active: boolean | null
          created_at: string
          end_date: string | null
          id: string
          options: Json
          question: string
          total_votes: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          options?: Json
          question: string
          total_votes?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          options?: Json
          question?: string
          total_votes?: number | null
        }
        Relationships: []
      }
      pre_bookings: {
        Row: {
          admin_note: string | null
          city: string | null
          color: string | null
          created_at: string
          customer_name: string
          delivery_option: string | null
          email: string | null
          id: string
          model: string
          notes: string | null
          payment_status: string | null
          phone: string
          status: string
          storage: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          city?: string | null
          color?: string | null
          created_at?: string
          customer_name: string
          delivery_option?: string | null
          email?: string | null
          id?: string
          model: string
          notes?: string | null
          payment_status?: string | null
          phone: string
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          city?: string | null
          color?: string | null
          created_at?: string
          customer_name?: string
          delivery_option?: string | null
          email?: string | null
          id?: string
          model?: string
          notes?: string | null
          payment_status?: string | null
          phone?: string
          status?: string
          storage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          model_id: string | null
          new_price: number
          old_price: number | null
          variant_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          new_price: number
          old_price?: number | null
          variant_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          new_price?: number
          old_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "phone_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          description: string | null
          featured: boolean | null
          highlights: string[] | null
          id: string
          image: string | null
          images: string[] | null
          in_stock: boolean | null
          name: string
          price: string
          price_value: number | null
          rating: number | null
          reviews_count: number | null
          series: string | null
          slug: string
          source_site: string | null
          source_url: string | null
          specs: Json | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          description?: string | null
          featured?: boolean | null
          highlights?: string[] | null
          id?: string
          image?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          name: string
          price: string
          price_value?: number | null
          rating?: number | null
          reviews_count?: number | null
          series?: string | null
          slug: string
          source_site?: string | null
          source_url?: string | null
          specs?: Json | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean | null
          highlights?: string[] | null
          id?: string
          image?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          name?: string
          price?: string
          price_value?: number | null
          rating?: number | null
          reviews_count?: number | null
          series?: string | null
          slug?: string
          source_site?: string | null
          source_url?: string | null
          specs?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_requests: {
        Row: {
          created_at: string | null
          description: string | null
          device_brand: string
          device_model: string
          email: string | null
          id: string
          issue_type: string
          name: string
          phone: string
          preferred_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          device_brand: string
          device_model: string
          email?: string | null
          id?: string
          issue_type: string
          name: string
          phone: string
          preferred_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          device_brand?: string
          device_model?: string
          email?: string | null
          id?: string
          issue_type?: string
          name?: string
          phone?: string
          preferred_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      repair_services: {
        Row: {
          created_at: string
          id: string
          model_id: string | null
          part_name: string | null
          price: number | null
          repair_type: string
          status: string | null
          time_required: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string | null
          part_name?: string | null
          price?: number | null
          repair_type: string
          status?: string | null
          time_required?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string | null
          part_name?: string | null
          price?: number | null
          repair_type?: string
          status?: string | null
          time_required?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_services_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          created_at: string | null
          id: string
          is_affiliate: boolean | null
          logo: string | null
          name: string
          status: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_affiliate?: boolean | null
          logo?: string | null
          name: string
          status?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_affiliate?: boolean | null
          logo?: string | null
          name?: string
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      search_aliases: {
        Row: {
          alias_text: string
          created_at: string
          id: string
          model_id: string | null
          normalized_text: string
        }
        Insert: {
          alias_text: string
          created_at?: string
          id?: string
          model_id?: string | null
          normalized_text: string
        }
        Update: {
          alias_text?: string
          created_at?: string
          id?: string
          model_id?: string | null
          normalized_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_aliases_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          keyword: string
          result_count: number | null
          user_ip: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          result_count?: number | null
          user_ip?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          result_count?: number | null
          user_ip?: string | null
        }
        Relationships: []
      }
      sell_listings: {
        Row: {
          brand: string | null
          category: string
          condition: string | null
          contact_info: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          images: string[] | null
          listing_type: string | null
          location: string | null
          model: string | null
          price: number
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category: string
          condition?: string | null
          contact_info?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          listing_type?: string | null
          location?: string | null
          model?: string | null
          price: number
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          condition?: string | null
          contact_info?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          listing_type?: string | null
          location?: string | null
          model?: string | null
          price?: number
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_admins: {
        Row: {
          created_at: string | null
          role: string
          status: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          status?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          status?: string
          store_id?: string
          user_id?: string
        }
        Relationships: []
      }
      store_pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          slug: string
          store_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          store_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          store_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          location: string
          logo_url: string | null
          map_url: string | null
          name: string
          owner_id: string | null
          owner_user_id: string | null
          phone: string | null
          services: string[] | null
          shop_no: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          location: string
          logo_url?: string | null
          map_url?: string | null
          name: string
          owner_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          services?: string[] | null
          shop_no?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string
          logo_url?: string | null
          map_url?: string | null
          name?: string
          owner_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          services?: string[] | null
          shop_no?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      unlocking_services: {
        Row: {
          created_at: string
          id: string
          model_id: string | null
          price: number
          service_type: string
          status: string | null
          time_required: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string | null
          price: number
          service_type: string
          status?: string | null
          time_required?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string | null
          price?: number
          service_type?: string
          status?: string | null
          time_required?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocking_services_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      used_phone_listings: {
        Row: {
          approved_price: number | null
          condition: string
          created_at: string
          expected_price: number
          id: string
          model_id: string | null
          seller_id: string
          status: string | null
          store_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          approved_price?: number | null
          condition: string
          created_at?: string
          expected_price: number
          id?: string
          model_id?: string | null
          seller_id: string
          status?: string | null
          store_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          approved_price?: number | null
          condition?: string
          created_at?: string
          expected_price?: number
          id?: string
          model_id?: string | null
          seller_id?: string
          status?: string | null
          store_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "used_phone_listings_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_phone_listings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "phone_variants"
            referencedColumns: ["id"]
          },
        ]
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
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      poll_results: {
        Row: {
          option_index: number | null
          poll_id: string | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_store_admin_by_email: {
        Args: { p_email: string; p_store_id: string }
        Returns: undefined
      }
      bootstrap_admin: { Args: never; Returns: boolean }
      bootstrap_suadmin_by_email: { Args: { p_email: string }; Returns: Json }
      claim_super_admin: { Args: never; Returns: undefined }
      create_user_admin: {
        Args: {
          p_email: string
          p_full_name?: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      get_admin_users_list: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_admin_users_list_secure: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_catalog_verification_stats: { Args: never; Returns: Json }
      get_poll_results: {
        Args: { p_poll_id: string }
        Returns: {
          option_index: number
          vote_count: number
        }[]
      }
      get_super_admin_stats: { Args: never; Returns: Json }
      grant_role_by_email: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["app_role"]
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
      is_admin: { Args: never; Returns: boolean }
      manage_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      no_admin_exists: { Args: never; Returns: boolean }
      normalize_price_value: { Args: { p_price: string }; Returns: number }
      revoke_role_by_email: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "suadmin"
        | "store_owner"
        | "public_user"
      article_category:
        | "mobile"
        | "laptop"
        | "tablet"
        | "audio"
        | "watch"
        | "gaming"
        | "news"
        | "review"
        | "comparison"
        | "guide"
        | "price"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "suadmin",
        "store_owner",
        "public_user",
      ],
      article_category: [
        "mobile",
        "laptop",
        "tablet",
        "audio",
        "watch",
        "gaming",
        "news",
        "review",
        "comparison",
        "guide",
        "price",
      ],
    },
  },
} as const
