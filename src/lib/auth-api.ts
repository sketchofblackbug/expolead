import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function requireAdminUser() {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 503 }
      ),
    };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, response: null as null };
}
