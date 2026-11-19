import type { TypedSupabaseClient } from "@/lib/supabase";
import type { Booth, BoothPublicInfo, BoothUpsert } from "@/types/lead";

export function toBoothPublicInfo(booth: Booth): BoothPublicInfo {
  return {
    id: booth.id,
    brand_name: booth.brand_name,
    booth_location: booth.booth_location,
    brochure_url: booth.brochure_url,
    whatsapp_enabled: booth.whatsapp_enabled,
  };
}

export function fallbackBoothPublicInfo(boothId: string): BoothPublicInfo {
  return {
    id: boothId,
    brand_name: boothId,
    booth_location: "",
    brochure_url: "",
    whatsapp_enabled: true,
  };
}

export async function fetchBoothById(
  client: TypedSupabaseClient,
  boothId: string
): Promise<Booth | null> {
  const { data, error } = await client
    .from("booths")
    .select(
      "id, brand_name, booth_location, brochure_url, whatsapp_enabled, created_at, updated_at"
    )
    .eq("id", boothId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Booth | null) ?? null;
}

export async function fetchAllBooths(client: TypedSupabaseClient): Promise<Booth[]> {
  const { data, error } = await client
    .from("booths")
    .select(
      "id, brand_name, booth_location, brochure_url, whatsapp_enabled, created_at, updated_at"
    )
    .order("brand_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Booth[]) ?? [];
}

export async function upsertBooth(
  client: TypedSupabaseClient,
  payload: BoothUpsert
): Promise<Booth> {
  const id = payload.id.trim();
  const brandName = payload.brand_name.trim();

  if (!id) throw new Error("Booth ID is required.");
  if (!brandName) throw new Error("Brand name is required.");

  const row = {
    id,
    brand_name: brandName,
    booth_location: (payload.booth_location ?? "").trim(),
    brochure_url: (payload.brochure_url ?? "").trim(),
    whatsapp_enabled: payload.whatsapp_enabled ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("booths")
    .upsert(row, { onConflict: "id" })
    .select(
      "id, brand_name, booth_location, brochure_url, whatsapp_enabled, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Booth;
}

export async function deleteBooth(
  client: TypedSupabaseClient,
  boothId: string
): Promise<void> {
  const { error } = await client.from("booths").delete().eq("id", boothId);
  if (error) {
    throw new Error(error.message);
  }
}
