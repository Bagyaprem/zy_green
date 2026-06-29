import { createClient } from '@supabase/supabase-js';

// import.meta.env is undefined outside Vite (e.g. Node test scripts) — guard it.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const supabaseUrl = env.VITE_SUPABASE_URL
  || 'https://aoiokvjxnfkecyzkpamo.supabase.co';

const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaW9rdmp4bmZrZWN5emtwYW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODQzNDQsImV4cCI6MjA5Njc2MDM0NH0.BKfTMDdQKeg2HOhUfJQqM8BMY8d7ShopBLChFwbvNxY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
