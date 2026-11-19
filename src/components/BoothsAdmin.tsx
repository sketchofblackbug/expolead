"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Booth } from "@/types/lead";

const emptyForm = {
  id: "",
  brand_name: "",
  booth_location: "",
  brochure_url: "",
  whatsapp_enabled: true,
};

export function BoothsAdmin() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/booths");
      const data = (await response.json()) as { booths?: Booth[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to load booths.");
      setBooths(data.booths ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booths.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (booth: Booth) => {
    setEditingId(booth.id);
    setForm({
      id: booth.id,
      brand_name: booth.brand_name,
      booth_location: booth.booth_location,
      brochure_url: booth.brochure_url,
      whatsapp_enabled: booth.whatsapp_enabled,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingId ? `/api/booths/${encodeURIComponent(editingId)}` : "/api/booths",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId
              ? {
                  brand_name: form.brand_name,
                  booth_location: form.booth_location,
                  brochure_url: form.brochure_url,
                  whatsapp_enabled: form.whatsapp_enabled,
                }
              : form
          ),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to save booth.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booth.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (boothId: string) => {
    if (!window.confirm(`Delete booth “${boothId}”? Existing leads are kept.`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/booths/${encodeURIComponent(boothId)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to delete booth.");
      if (editingId === boothId) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete booth.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to leads
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
            Booth settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Brand name, location, brochure link, and WhatsApp follow-up per booth.
          </p>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <form onSubmit={handleSubmit} className="surface-card space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          {editingId ? (
            <Pencil className="h-4 w-4 text-brand-600" />
          ) : (
            <Plus className="h-4 w-4 text-brand-600" />
          )}
          <h2 className="text-base font-semibold text-brand-950">
            {editingId ? `Edit ${editingId}` : "Create booth"}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-1">
            <span className="text-sm font-medium text-brand-900">Booth ID</span>
            <input
              className="input-field"
              value={form.id}
              disabled={Boolean(editingId)}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              placeholder="hall-5-b12"
              required
            />
            <p className="text-xs text-slate-500">Used in /lead/[boothId] and QR codes</p>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-brand-900">Brand name</span>
            <input
              className="input-field"
              value={form.brand_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, brand_name: event.target.value }))
              }
              placeholder="Acme Robotics"
              required
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-brand-900">Booth location</span>
            <input
              className="input-field"
              value={form.booth_location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, booth_location: event.target.value }))
              }
              placeholder="Hall 5, Booth B12"
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-brand-900">Brochure URL</span>
            <input
              className="input-field"
              type="url"
              value={form.brochure_url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, brochure_url: event.target.value }))
              }
              placeholder="https://example.com/brochure.pdf"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            checked={form.whatsapp_enabled}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, whatsapp_enabled: event.target.checked }))
            }
          />
          <span>
            <span className="font-medium text-brand-950">WhatsApp enabled</span>
            <span className="text-slate-500"> — send template after consented captures</span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingId ? "Save changes" : "Create booth"}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="surface-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-brand-950">Your booths</h2>
        {loading ? (
          <LoadingState label="Loading booths…" />
        ) : booths.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No booths yet. Create one above so WhatsApp can use brand, location, and brochure.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {booths.map((booth) => (
              <li
                key={booth.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-brand-950">{booth.brand_name}</p>
                  <p className="font-mono text-xs text-slate-500">{booth.id}</p>
                  {booth.booth_location ? (
                    <p className="mt-1 text-sm text-slate-600">{booth.booth_location}</p>
                  ) : null}
                  {booth.brochure_url ? (
                    <a
                      href={booth.brochure_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-sm text-brand-700 hover:underline"
                    >
                      {booth.brochure_url}
                    </a>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    WhatsApp:{" "}
                    <span className="font-medium text-slate-700">
                      {booth.whatsapp_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => startEdit(booth)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-red-700"
                    onClick={() => void handleDelete(booth.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
