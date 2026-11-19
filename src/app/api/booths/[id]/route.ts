import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { deleteBooth, fetchBoothById, toBoothPublicInfo, upsertBooth } from "@/lib/booths";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

/** Public booth lookup for the capture page (no secrets). */
export async function GET(_request: Request, context: RouteContext) {
  const boothId = decodeURIComponent(context.params.id).trim();
  if (!boothId) {
    return NextResponse.json({ error: "Booth ID required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      booth: {
        id: boothId,
        brand_name: boothId,
        booth_location: "",
        brochure_url: "",
        whatsapp_enabled: true,
      },
    });
  }

  try {
    const client = createSupabaseClient();
    const booth = await fetchBoothById(client, boothId);
    if (!booth) {
      return NextResponse.json({
        booth: {
          id: boothId,
          brand_name: boothId,
          booth_location: "",
          brochure_url: "",
          whatsapp_enabled: true,
        },
        missing: true,
      });
    }
    return NextResponse.json({ booth: toBoothPublicInfo(booth) });
  } catch (err) {
    return NextResponse.json(
      {
        booth: {
          id: boothId,
          brand_name: boothId,
          booth_location: "",
          brochure_url: "",
          whatsapp_enabled: true,
        },
        warning: err instanceof Error ? err.message : "Booth lookup failed",
      },
      { status: 200 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const boothId = decodeURIComponent(context.params.id).trim();
  const body = (await request.json().catch(() => ({}))) as {
    brand_name?: string;
    booth_location?: string;
    brochure_url?: string;
    whatsapp_enabled?: boolean;
  };

  try {
    const supabase = createServerSupabaseClient();
    const existing = await fetchBoothById(supabase, boothId);
    if (!existing) {
      return NextResponse.json({ error: "Booth not found." }, { status: 404 });
    }

    const booth = await upsertBooth(supabase, {
      id: boothId,
      brand_name: body.brand_name ?? existing.brand_name,
      booth_location:
        body.booth_location !== undefined ? body.booth_location : existing.booth_location,
      brochure_url:
        body.brochure_url !== undefined ? body.brochure_url : existing.brochure_url,
      whatsapp_enabled:
        body.whatsapp_enabled !== undefined
          ? body.whatsapp_enabled
          : existing.whatsapp_enabled,
    });

    return NextResponse.json({ booth });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update booth." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const boothId = decodeURIComponent(context.params.id).trim();

  try {
    const supabase = createServerSupabaseClient();
    await deleteBooth(supabase, boothId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete booth." },
      { status: 400 }
    );
  }
}
