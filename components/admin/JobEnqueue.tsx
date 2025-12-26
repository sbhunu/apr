"use client";

import { useState } from "react";

export default function JobEnqueue({ onCreated }: { onCreated?: () => void }) {
  const [type, setType] = useState("generic");
  const [payload, setPayload] = useState("{}");
  const [runAt, setRunAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(payload || "{}");
    } catch (err: any) {
      setMessage("Invalid JSON for payload");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payload: parsedPayload,
          run_at: runAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setMessage("Job queued: " + json.job?.id);
      setPayload("{}");
      setRunAt("");
      onCreated?.();
    } catch (err: any) {
      setMessage(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border p-4 bg-white shadow-sm">
      <h3 className="text-lg font-medium">Enqueue Job</h3>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <label className="block text-sm text-slate-600">Type</label>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600">Payload (JSON)</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded border px-2 py-1 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600">
            Run at (optional ISO datetime)
          </label>
          <input
            value={runAt}
            onChange={(e) => setRunAt(e.target.value)}
            placeholder="2025-12-25T12:00:00Z"
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-sky-600 px-3 py-1 text-white disabled:opacity-60">
            {loading ? "Enqueuing…" : "Enqueue"}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
      </form>
    </div>
  );
}
