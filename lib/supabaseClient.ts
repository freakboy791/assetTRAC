import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a fallback client for development builds
let supabase: any

if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  // Client-side with valid environment variables
  console.log('Creating Supabase client with environment variables')
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else if (supabaseUrl && supabaseAnonKey) {
  // Server-side with valid environment variables
  console.log('Creating Supabase client with environment variables (server)')
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Fallback for development builds without environment variables
  console.warn('⚠️ Supabase environment variables not configured. Using mock client.')
  supabase = {
    auth: {
      signUp: () => {
        console.log('Mock signUp called - environment variables not configured')
        return Promise.resolve({ 
          error: { 
            message: 'Environment variables not configured. Please create .env.local with your Supabase credentials.' 
          } 
        })
      },
      signInWithPassword: () => {
        console.log('Mock signInWithPassword called - environment variables not configured')
        return Promise.resolve({ 
          error: { 
            message: 'Environment variables not configured. Please create .env.local with your Supabase credentials.' 
          } 
        })
      },
      resetPasswordForEmail: () => {
        console.log('Mock resetPasswordForEmail called - environment variables not configured')
        return Promise.resolve({ 
          error: { 
            message: 'Environment variables not configured. Please create .env.local with your Supabase credentials.' 
          } 
        })
      }
    }
  }
}

export { supabase }

export type AuthError = {
  message: string
}

export type AuthResult = {
  success: boolean
  message: string
  error?: AuthError
}
