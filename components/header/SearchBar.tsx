"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!q) return setResults([]);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=10`
        );
        if (!res.ok) return setResults([]);
        const json = await res.json();
        setResults(json.results || []);
      } catch (e) {
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-md">
      <label className="sr-only">Search</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search parcels, titles, certificates..."
          className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg border border-slate-100 bg-white shadow-lg">
            {results.map((r: any) => {
              const href =
                r.entity === "plan"
                  ? `/planning/schemes/${r.id}`
                  : r.entity === "deed"
                  ? `/deeds/${r.id}`
                  : r.entity === "certificate"
                  ? `/verify/${r.id}`
                  : "#";
              return (
                <a
                  key={String(r.id)}
                  href={href}
                  className="block px-3 py-2 text-sm hover:bg-slate-50">
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-slate-400">
                    {r.meta?.excerpt || ""}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
