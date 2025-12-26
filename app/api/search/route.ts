import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!q) return NextResponse.json({ results: [] });

  const supabase = await createClient();

  // Use the search_documents RPC if available
  const { data, error } = await supabase.rpc("search_documents_query", {
    p_q: q,
    p_limit: limit,
  } as any);

  if (error) {
    // Fallback to basic ilike queries
    const plans = await supabase
      .from("apr.sectional_scheme_plans")
      .select("id, title, scheme_number, locality")
      .ilike("title", `%${q}%`)
      .limit(limit);

    const deeds = await supabase
      .from("apr.deeds")
      .select("id, reference, owner_name")
      .ilike("reference", `%${q}%`)
      .limit(limit);

    const results: any[] = [];
    if (!plans.error && plans.data) {
      plans.data.forEach((p: any) =>
        results.push({
          entity: "plan",
          id: p.id,
          title: p.title || p.scheme_number,
          meta: { locality: p.locality },
        })
      );
    }
    if (!deeds.error && deeds.data) {
      deeds.data.forEach((d: any) =>
        results.push({
          entity: "deed",
          id: d.id,
          title: d.reference,
          meta: { owner: d.owner_name },
        })
      );
    }

    return NextResponse.json({ results: results.slice(0, limit) });
  }

  // Map search_documents rows to unified result shape
  const results = (data || []).map((r: any) => ({
    entity: r.entity_type,
    id: r.entity_id,
    title: r.title,
    meta: { excerpt: r.body },
  }));

  return NextResponse.json({ results: results.slice(0, limit) });
}
