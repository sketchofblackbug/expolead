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
import type { Lead, LeadStatus } from "@/types/lead";

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-800 ring-sky-200",
  contacted: "bg-amber-50 text-amber-800 ring-amber-200",
  qualified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  archived: "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Calcutta",
  }).format(new Date(value));
}

export function AdminLeadTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [source, setSource] = useState<"supabase" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchLeads();
      setLeads(result.leads);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery =
        !normalized ||
        lead.name.toLowerCase().includes(normalized) ||
        lead.phone.toLowerCase().includes(normalized) ||
        lead.booth_id.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [leads, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Protected soon
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
            Leads dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review every visitor captured across booths. Auth will be added later.
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
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">New</p>
          <p className="mt-2 text-2xl font-semibold text-brand-950">
            {leads.filter((lead) => lead.status === "new").length}
          </p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data source</p>
          <p className="mt-2 text-lg font-semibold capitalize text-brand-950">{source}</p>
        </div>
      </div>

      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder="Search name, phone, or booth"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="relative sm:w-48">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="input-field appearance-none pl-10"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | LeadStatus)
              }
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading leads…
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                  <th className="px-3 py-3 font-semibold">Booth</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
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
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {lead.booth_id}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[lead.status]}`}
                      >
                        {lead.status}
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
