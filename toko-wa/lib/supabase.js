import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient("https://pieimlhqiilxkpwoxvvu.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZWltbGhxaWlseGtwd294dnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NDU2MTMsImV4cCI6MjEwNTEyMTYxM30.uhlMhmm_WLK9hw8mKyvw2X9t-EsoFWXct_1-pVlsrlw");