import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://qhkzmiceieeiwxxcxwua.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa3ptaWNlaWVlaXd4eGN4d3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjU1MjUsImV4cCI6MjA5NjA0MTUyNX0.Z3rLYpHJ8R8EZYRpuFGQVd3kxKR_5u4CWf-3LeYcb0E'
)
