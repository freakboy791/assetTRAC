import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export { supabase }

export type AuthError = {
  message: string
}

export type AuthResult = {
  success: boolean
  message: string
  error?: AuthError
}
