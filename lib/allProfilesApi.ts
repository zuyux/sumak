import { supabase } from '@/lib/supabaseClient';

export async function getAllUsernames() {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, address')
    .eq('account_status', 'active')
    .eq('profile_public', true)
    .order('username', { ascending: true });
  if (error) throw error;
  return data || [];
}
