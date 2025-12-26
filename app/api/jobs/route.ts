import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, payload = {}, run_at = null } = body;

    const { data, error } = await supabase
      .from("apr.jobs")
      .insert([{ type, payload, run_at }])
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ job: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Basic listing for current user; admin users may see all.
  const { data: profile } = await supabase
    .from("apr.user_profiles")
    .select("role")
    .eq("user_id", user.user.id)
    .maybeSingle();

  let query = supabase
    .from("apr.jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!(profile && profile.data && profile.data.role === "admin")) {
    query = query.eq("payload->>requester", user.user.id);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data });
}
