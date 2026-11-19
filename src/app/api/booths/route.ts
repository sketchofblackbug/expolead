import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-api";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchAllBooths, upsertBooth } from "@/lib/booths";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ booths: [] });
  }

  try {
    const supabase = createServerSupabaseClient();
    const booths = await fetchAllBooths(supabase);
    return NextResponse.json({ booths });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load booths. Run supabase/migrate-whatsapp.sql if the table is missing.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    brand_name?: string;
    booth_location?: string;
    brochure_url?: string;
    whatsapp_enabled?: boolean;
  };

  try {
    const supabase = createServerSupabaseClient();
    const booth = await upsertBooth(supabase, {
      id: body.id ?? "",
      brand_name: body.brand_name ?? "",
      booth_location: body.booth_location,
      brochure_url: body.brochure_url,
      whatsapp_enabled: body.whatsapp_enabled,
    });
    return NextResponse.json({ booth });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save booth." },
      { status: 400 }
    );
  }
}
