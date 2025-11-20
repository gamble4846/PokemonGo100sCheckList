export const SUPABASE_CONFIG = {
  SUPABASE_URL: 'https://buocfdzizcojbednhkre.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1b2NmZHppemNvamJlZG5oa3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDgxOTgsImV4cCI6MjA3OTE4NDE5OH0.EWtJ8KY5AkB7mWKqmrNBU62A4pBnL3RHlUYO8NvSP-w',
  SUPABASE_SCHEMA: 'public' as const,
  AUTH_OPTIONS: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

