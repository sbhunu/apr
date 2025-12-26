"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import Link from "next/link";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<
    Array<{ id: string; title: string; created_at?: string }>
  >([]);

  useEffect(() => {
    // preload a small number of notifications
    let mounted = true;
    (async () => {
      try {
        // Prefer server API which enforces auth and RLS
        const res = await fetch("/api/notifications");
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setItems((json.notifications || []) as any);
          return;
        }

        // Fallback: graceful no-data state
        setItems([]);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        aria-label="Notifications"
        className="rounded-full p-2 text-slate-600 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-100 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2 max-h-64 overflow-auto">
            {items.length === 0 && (
              <p className="text-sm text-slate-400">No recent notifications</p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href="#"
                className="block rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{n.title}</span>
                  <span className="text-xs text-slate-400">
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString()
                      : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
