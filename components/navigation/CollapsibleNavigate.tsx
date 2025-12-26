"use client";

import { useState } from "react";
import { ArrowRightCircle, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default function CollapsibleNavigate({
  menu,
}: {
  menu: Array<{ id?: string; title: string; href?: string }>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 w-full">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
        <span>Navigate</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>
      {open && (
        <nav className="mt-3 space-y-2">
          {menu.map((item) => (
            <Link
              key={item.title}
              href={item.href || `#${item.id}`}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:border-slate-200">
              {item.title}
              <ArrowRightCircle className="h-4 w-4 text-emerald-500" />
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
