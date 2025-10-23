import { supabase } from '@/lib/supabaseClient';

export async function getNftsByCreator(address: string) {
  // This assumes you have a table 'nfts' with a 'creator' or 'owner' field
  const { data, error } = await supabase
    .from('nfts')
    .select('*')
    .eq('creator', address)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
