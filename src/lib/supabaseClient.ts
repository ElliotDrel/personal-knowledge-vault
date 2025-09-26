import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we have valid Supabase configuration
const hasValidConfig = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.startsWith('eyJ')

const devUrl = hasValidConfig ? supabaseUrl : 'https://placeholder.supabase.co'
const devKey = hasValidConfig ? supabaseAnonKey : 'placeholder-anon-key'

if (!devUrl || !devKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(devUrl, devKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export const isSupabaseConfigured = hasValidConfig