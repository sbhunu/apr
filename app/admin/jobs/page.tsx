import JobEnqueue from "@/components/admin/JobEnqueue";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs, error } = await supabase
    .from("apr.jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin: Jobs</h1>
        <div className="flex gap-2">
          <Link href="/admin/security">
            <Button variant="outline" size="sm">Security & PKI</Button>
          </Link>
          <Link href="/admin/monitoring">
            <Button variant="outline" size="sm">Monitoring</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <JobEnqueue onCreated={() => location.reload()} />
        </div>

        <div className="md:col-span-2">
          <div className="rounded border bg-white p-4">
            <h2 className="text-lg font-medium">Recent jobs</h2>
            <div className="mt-3 space-y-2">
              {error && (
                <p className="text-sm text-red-600">
                  {String(error.message || error)}
                </p>
              )}
              {(!jobs || jobs.length === 0) && (
                <p className="text-sm text-slate-500">No recent jobs</p>
              )}
              {jobs &&
                jobs.map((j: any) => (
                  <div
                    key={j.id}
                    className="flex items-start justify-between rounded border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{j.type}</div>
                      <div className="text-xs text-slate-500">
                        {j.payload ? JSON.stringify(j.payload) : ""}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(j.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
