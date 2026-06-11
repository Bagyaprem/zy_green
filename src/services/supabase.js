import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || 'https://aoiokvjxnfkecyzkpamo.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaW9rdmp4bmZrZWN5emtwYW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODQzNDQsImV4cCI6MjA5Njc2MDM0NH0.BKfTMDdQKeg2HOhUfJQqM8BMY8d7ShopBLChFwbvNxY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
