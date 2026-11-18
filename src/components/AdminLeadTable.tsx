"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { fetchLeads } from "@/lib/leads";
import type { Lead } from "@/types/lead";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Calcutta",
  }).format(new Date(value));
}

export function AdminLeadTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | string>("all");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchLeads();
      setLeads(result.leads);
      setDataSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sourceOptions = useMemo(() => {
    const unique = new Set(leads.map((lead) => lead.source));
    return Array.from(unique).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery =
        !normalized ||
        lead.name.toLowerCase().includes(normalized) ||
        lead.phone.toLowerCase().includes(normalized) ||
        (lead.email?.toLowerCase().includes(normalized) ?? false) ||
        lead.booth_id.toLowerCase().includes(normalized);
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      return matchesQuery && matchesSource;
    });
  }, [leads, query, sourceFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Auth required for live data
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
            Leads dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            RLS allows only authenticated users to read leads. Auth comes next.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-secondary">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total leads</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-brand-950">
            <Users className="h-5 w-5 text-brand-600" />
            {leads.length}
          </p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Voice captures</p>
          <p className="mt-2 text-2xl font-semibold text-brand-950">
            {leads.filter((lead) => lead.source === "voice").length}
          </p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data source</p>
          <p className="mt-2 text-lg font-semibold capitalize text-brand-950">{dataSource}</p>
        </div>
      </div>

      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder="Search name, phone, email, or booth"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="relative sm:w-48">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="input-field appearance-none pl-10"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
            >
              <option value="all">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading leads…
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No leads match your filters yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Phone</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Booth</th>
                  <th className="px-3 py-3 font-semibold">Source</th>
                  <th className="px-3 py-3 font-semibold">Captured</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-3 py-3 font-medium text-brand-950">{lead.name}</td>
                    <td className="px-3 py-3 text-slate-700">{lead.phone}</td>
                    <td className="px-3 py-3 text-slate-700">{lead.email ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {lead.booth_id}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold capitalize text-brand-800 ring-1 ring-inset ring-brand-100">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(lead.created_at)}
                      <span className="ml-1 text-xs text-slate-400">(IST)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
