"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, sub, accent = "orange" }: { label: string; value: string; sub?: string; accent?: "orange" | "sky" | "emerald" | "rose" }) {
  const accents: Record<string, string> = {
    orange: "bg-sky-50 text-sky-800 border-sky-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <div className={cn("rounded-2xl border p-4", accents[accent])}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-75">{sub}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
      <p className="font-bold text-slate-600">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function SectionCard({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-slate-800">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StarInput({ value, onChange, size = 22 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          className="p-0.5 transition-transform hover:scale-110"
          onClick={() => onChange(value === n ? n - 1 : n)}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}
          />
        </button>
      ))}
    </div>
  );
}

export const CHIP: Record<string, string> = {
  lunas: "bg-emerald-100 text-emerald-700",
  sebagian: "bg-amber-100 text-amber-700",
  belum: "bg-slate-100 text-slate-500",
  H: "bg-emerald-100 text-emerald-700",
  I: "bg-sky-100 text-sky-700",
  A: "bg-rose-100 text-rose-700",
};
