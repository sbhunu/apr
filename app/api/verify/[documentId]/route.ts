import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  const supabase = await createClient();
  const documentId = params.documentId;

  // Try to find a digital signature record for this document
  const { data, error } = await supabase
    .from("apr.digital_signatures")
    .select("*")
    .eq("document_id", documentId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // For now return stored verification_result if available. A future enhancement will
  // call out to the PKI provider / OCSP responder and perform live checks.
  return NextResponse.json({ signature: data });
}
