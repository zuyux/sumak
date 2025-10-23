// /app/api/users/route.ts
import { NextResponse } from "next/server";


import { supabaseAdmin } from "@/lib/supabaseClient";

export async function GET() {
  // Fetch addresses from connected_accounts
  const { data: accounts, error: accountsError } = await supabaseAdmin
    .from("connected_accounts")
    .select("address")
    .order("address", { ascending: true });

  // Fetch addresses from profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("address")
    .order("address", { ascending: true });

  if (accountsError || profilesError) {
    return NextResponse.json({ error: accountsError?.message || profilesError?.message }, { status: 500 });
  }

  // Merge and deduplicate by address
  const all = [...(accounts || []), ...(profiles || [])];
  const seen = new Set();
  const merged = all.filter((user) => {
    if (!user.address) return false;
    const addr = user.address.toLowerCase();
    if (seen.has(addr)) return false;
    seen.add(addr);
    return true;
  });

  return NextResponse.json(merged);
}
