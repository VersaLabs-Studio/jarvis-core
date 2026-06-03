// =============================================================================
// AUTO-GENERATED TYPES — Do not edit manually
// Generated from: supabase/migrations/0001_init.sql + 0003_schema_completion.sql
// Run: supabase gen types typescript --project-id <id> to regenerate
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'pro' | 'enterprise'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      workflows: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          status: Database['public']['Enums']['workflow_status']
          definition: Json
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          status?: Database['public']['Enums']['workflow_status']
          definition?: Json
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          status?: Database['public']['Enums']['workflow_status']
          definition?: Json
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflows_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflows_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      integrations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          provider: string
          status: Database['public']['Enums']['integration_status']
          config: Json
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          provider: string
          status?: Database['public']['Enums']['integration_status']
          config?: Json
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          provider?: string
          status?: Database['public']['Enums']['integration_status']
          config?: Json
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'integrations_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integrations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      skills: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          status: Database['public']['Enums']['skill_status']
          config: Json
          capabilities: string[]
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          status?: Database['public']['Enums']['skill_status']
          config?: Json
          capabilities?: string[]
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          status?: Database['public']['Enums']['skill_status']
          config?: Json
          capabilities?: string[]
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'skills_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skills_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: string
          status: Database['public']['Enums']['service_status']
          config: Json
          endpoints: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: string
          status?: Database['public']['Enums']['service_status']
          config?: Json
          endpoints?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: string
          status?: Database['public']['Enums']['service_status']
          config?: Json
          endpoints?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'services_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'services_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      secrets: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: Database['public']['Enums']['secret_type']
          value: string
          description: string | null
          expires_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type?: Database['public']['Enums']['secret_type']
          value: string
          description?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: Database['public']['Enums']['secret_type']
          value?: string
          description?: string | null
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'secrets_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'secrets_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          tenant_id: string
          actor_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          actor_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          metadata?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          actor_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          metadata?: Json
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          tenant_id: string
          title: string
          context: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title?: string
          context?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          context?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_sessions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          tenant_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string | null
          model: string | null
          tools_used: string[]
          tokens_in: number | null
          tokens_out: number | null
          duration_ms: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          tenant_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content?: string | null
          model?: string | null
          tools_used?: string[]
          tokens_in?: number | null
          tokens_out?: number | null
          duration_ms?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          tenant_id?: string
          role?: 'user' | 'assistant' | 'system' | 'tool'
          content?: string | null
          model?: string | null
          tools_used?: string[]
          tokens_in?: number | null
          tokens_out?: number | null
          duration_ms?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'chat_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_runs: {
        Row: {
          id: string
          workflow_id: string
          tenant_id: string
          status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
          output: string | null
          error: string | null
          started_at: string | null
          finished_at: string | null
          duration_ms: number | null
        }
        Insert: {
          id?: string
          workflow_id: string
          tenant_id: string
          status?: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
          output?: string | null
          error?: string | null
          started_at?: string | null
          finished_at?: string | null
          duration_ms?: number | null
        }
        Update: {
          id?: string
          workflow_id?: string
          tenant_id?: string
          status?: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
          output?: string | null
          error?: string | null
          started_at?: string | null
          finished_at?: string | null
          duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_runs_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflow_runs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      analytics_events: {
        Row: {
          id: string
          tenant_id: string
          event_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          event_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          event_type?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analytics_events_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      system_logs: {
        Row: {
          id: string
          tenant_id: string | null
          level: 'info' | 'warn' | 'error' | 'debug'
          service: string
          message: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          level: 'info' | 'warn' | 'error' | 'debug'
          service: string
          message: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          level?: 'info' | 'warn' | 'error' | 'debug'
          service?: string
          message?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'system_logs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      bootstrap_user: {
        Args: {
          p_user_id: string
          p_email: string
          p_full_name?: string
        }
        Returns: Json
      }
    }
    Enums: {
      workflow_status: 'draft' | 'active' | 'paused' | 'archived'
      integration_status: 'pending' | 'connected' | 'disconnected' | 'error'
      skill_status: 'draft' | 'active' | 'disabled' | 'archived'
      service_status: 'provisioning' | 'running' | 'stopped' | 'error' | 'terminated'
      secret_type: 'api_key' | 'oauth_token' | 'database_url' | 'webhook_secret' | 'custom'
    }
    CompositeTypes: Record<string, never>
  }
}
