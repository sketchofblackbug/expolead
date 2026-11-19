import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-api";
import { validatePhoneNumber } from "@/lib/phone";
import {
  createSupabaseClient,
  createSupabaseServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { fetchBoothById, toBoothPublicInfo } from "@/lib/booths";
import { isWhatsAppConfigured, sendWhatsAppTemplate, toLocalPhoneDigits } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      {
        error:
          "WhatsApp is not configured. Add WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEMPLATE_NAME.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    boothId?: string;
    visitorName?: string;
  };

  const phoneResult = validatePhoneNumber(body.phone ?? "");
  if (!phoneResult.valid) {
    return NextResponse.json(
      { error: phoneResult.message ?? "Enter a valid 10-digit Indian mobile." },
      { status: 400 }
    );
  }

  let brandName = "ExpoLead Demo";
  let boothLocation = "Test booth";
  let brochureUrl = process.env.NEXT_PUBLIC_APP_URL || "https://expolead-nu.vercel.app";

  const boothId = (body.boothId ?? "").trim();
  if (boothId && isSupabaseConfigured()) {
    try {
      let client;
      try {
        client = createSupabaseServiceClient();
      } catch {
        client = createSupabaseClient();
      }
      const booth = await fetchBoothById(client, boothId);
      if (booth) {
        const info = toBoothPublicInfo(booth);
        brandName = info.brand_name;
        boothLocation = info.booth_location || boothLocation;
        brochureUrl = info.brochure_url || brochureUrl;
      }
    } catch {
      // keep defaults
    }
  }

  const result = await sendWhatsAppTemplate({
    toDigits: toLocalPhoneDigits(phoneResult.normalized),
    visitorName: (body.visitorName ?? "Test Visitor").trim() || "Test Visitor",
    brandName,
    boothLocation,
    brochureUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    to: `91${toLocalPhoneDigits(phoneResult.normalized)}`,
  });
}
