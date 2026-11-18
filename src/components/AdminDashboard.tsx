"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Filter,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import { downloadLeadsCsv } from "@/lib/csv";
import { formatLeadDateTime, isLeadFromToday } from "@/lib/datetime";
import { fetchLeads } from "@/lib/leads";
import { friendlySaveError } from "@/lib/speech";
import type { Lead } from "@/types/lead";

export function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [boothFilter, setBoothFilter] = useState("all");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchLeads();
      setLeads(result.leads);
      setDataSource(result.source);
    } catch (err) {
      setError(
        friendlySaveError(err instanceof Error ? err.message : "Failed to load leads.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const boothOptions = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => lead.booth_id))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [leads]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const phoneQuery = normalized.replace(/\s+/g, "");

    return leads.filter((lead) => {
      const matchesQuery =
        !normalized ||
        lead.name.toLowerCase().includes(normalized) ||
        lead.phone.toLowerCase().includes(normalized) ||
        lead.phone.replace(/\s+/g, "").includes(phoneQuery);

      const matchesBooth = boothFilter === "all" || lead.booth_id === boothFilter;
      return matchesQuery && matchesBooth;
    });
  }, [leads, query, boothFilter]);

  const totalLeads = leads.length;
  const leadsToday = useMemo(
    () => leads.filter((lead) => isLeadFromToday(lead.created_at)).length,
    [leads]
  );

  const handleExport = () => {
    const rows = filtered.length > 0 ? filtered : leads;
    downloadLeadsCsv(rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            ExpoLead Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
            Leads dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review booth captures ·{" "}
            <span className="font-medium text-slate-800">
              {dataSource === "supabase" ? "Live from Supabase" : "Demo data"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn-primary"
            disabled={loading || leads.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="surface-card px-4 py-4 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total leads
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-brand-950 sm:text-3xl">
            <Users className="h-5 w-5 text-brand-600" />
            {loading ? "—" : totalLeads}
          </p>
        </div>
        <div className="surface-card px-4 py-4 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Leads today
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-brand-950 sm:text-3xl">
            <CalendarDays className="h-5 w-5 text-accent-600" />
            {loading ? "—" : leadsToday}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Asia/Calcutta</p>
        </div>
      </div>

      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search by name or phone</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder="Search by name or phone"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="relative lg:w-56">
            <span className="sr-only">Filter by booth</span>
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="input-field appearance-none pl-10"
              value={boothFilter}
              onChange={(event) => setBoothFilter(event.target.value)}
            >
              <option value="all">All booths</option>
              {boothOptions.map((boothId) => (
                <option key={boothId} value={boothId}>
                  {boothId}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            Showing{" "}
            <span className="font-semibold text-slate-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{leads.length}</span> leads
          </p>
          {(query || boothFilter !== "all") && (
            <button
              type="button"
              className="font-medium text-brand-700 hover:underline"
              onClick={() => {
                setQuery("");
                setBoothFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <LoadingState label="Loading leads…" />
        ) : error ? (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No leads match your search or booth filter.
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="mt-4 space-y-3 md:hidden">
              {filtered.map((lead) => (
                <article
                  key={lead.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-brand-950">{lead.name}</h2>
                      <a
                        href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                        className="mt-0.5 block text-sm font-medium text-brand-700"
                      >
                        {lead.phone}
                      </a>
                    </div>
                    <span className="shrink-0 rounded-lg bg-white px-2 py-1 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200">
                      {lead.booth_id}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatLeadDateTime(lead.created_at)}{" "}
                    <span className="text-slate-400">(IST)</span>
                  </p>
                  {lead.notes ? (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-100">
                      {lead.notes}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm italic text-slate-400">No notes</p>
                  )}
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Phone</th>
                    <th className="px-3 py-3 font-semibold">Booth ID</th>
                    <th className="px-3 py-3 font-semibold">Date / Time</th>
                    <th className="px-3 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-3.5 font-medium text-brand-950">{lead.name}</td>
                      <td className="px-3 py-3.5">
                        <a
                          href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                          className="text-brand-700 hover:underline"
                        >
                          {lead.phone}
                        </a>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-xs text-slate-600">
                        {lead.booth_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                        {formatLeadDateTime(lead.created_at)}
                        <span className="ml-1 text-xs text-slate-400">IST</span>
                      </td>
                      <td className="max-w-xs px-3 py-3.5 text-slate-700">
                        {lead.notes ? (
                          <span className="line-clamp-2">{lead.notes}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
