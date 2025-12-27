"use client";

import { useState } from "react";
import Link from "next/link";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        aria-label="User menu"
        className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">
        <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
          A
        </span>
        <span className="hidden sm:inline">Admin</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-100 bg-white p-2 shadow-lg">
          <Link
            href="/settings/password"
            className="block rounded px-3 py-2 text-sm hover:bg-slate-50">
            Change Password
          </Link>
          <Link
            href="/login"
            className="block rounded px-3 py-2 text-sm text-emerald-600 hover:bg-slate-50">
            Sign out
          </Link>
        </div>
      )}
    </div>
  );
}
