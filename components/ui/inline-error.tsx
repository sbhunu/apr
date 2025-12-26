"use client";

export default function InlineError({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p className="mt-1 text-sm text-rose-600">{children}</p>;
}
