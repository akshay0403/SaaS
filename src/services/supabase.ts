import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase credentials missing or invalid. Auth features will be disabled.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  credits_used: number;
  is_pro: boolean;
  created_at: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found is fine
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data;
  } catch (err: any) {
    console.error('Supabase getProfile failed:', err);
    return null;
  }
}

export async function incrementCredits(userId: string) {
  try {
    const { error } = await supabase.rpc('increment_credits', { user_id: userId });
    if (error) {
      console.error('Error incrementing credits:', error);
      throw error;
    }
  } catch (err: any) {
    console.error('Supabase incrementCredits failed:', err);
  }
}
