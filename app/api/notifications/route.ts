import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.user.id;

  // Notifications table doesn't exist yet - return empty array for now
  // TODO: Create notifications table in database migration
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        return NextResponse.json({ notifications: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (e: any) {
    // Table doesn't exist - return empty array
    return NextResponse.json({ notifications: [] });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  // Only allow authenticated users to create notifications from UI. System notifications
  // should be created by server processes using service role.
  if (!user?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, payload = {}, link = null, user_id = null } = body;

    // Notifications table doesn't exist yet - return error
    // TODO: Create notifications table in database migration
    return NextResponse.json(
      { error: "Notifications table not yet implemented" },
      { status: 501 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
