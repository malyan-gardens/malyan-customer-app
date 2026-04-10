import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function normalizeE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed.startsWith("+")) return null;
  const digits = trimmed.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function syntheticEmail(phone: string): string {
  const digits = phone.replace(/\+/g, "");
  return `wa_${digits}@customer.malyan.otp`;
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
  return `${b64}Aa1!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error("verify-whatsapp-otp: missing Supabase env");
    return jsonResponse(
      { ok: false, error: "Server configuration error" },
      500
    );
  }

  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  const phone = normalizeE164(String(body.phone ?? ""));
  const code = String(body.code ?? "").replace(/\D/g, "");

  if (!phone || code.length !== 6) {
    return jsonResponse({ ok: false, error: "Invalid phone or code" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date().toISOString();

  const { data: rows, error: selErr } = await admin
    .from("otp_codes")
    .select("id, code, expires_at, consumed_at")
    .eq("phone", phone)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selErr) {
    console.error("otp select:", selErr);
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  const row = rows?.[0];
  if (!row || row.code !== code) {
    return jsonResponse({ ok: false, error: "Invalid or expired code" }, 401);
  }

  await admin
    .from("otp_codes")
    .update({ consumed_at: now })
    .eq("id", row.id);

  const email = syntheticEmail(phone);
  const password = randomPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    phone,
    email,
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { sign_in_provider: "whatsapp_otp" },
  });

  if (createErr) {
    const msg = createErr.message?.toLowerCase() ?? "";
    if (
      msg.includes("already been registered") ||
      msg.includes("already exists") ||
      (createErr as { code?: string }).code === "user_already_exists"
    ) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) {
        console.error("listUsers:", listErr);
        return jsonResponse({ ok: false, error: "Auth error" }, 500);
      }
      const existing = list.users.find((u) => u.phone === phone);
      if (!existing) {
        return jsonResponse(
          { ok: false, error: "Could not resolve existing user" },
          500
        );
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(
        existing.id,
        { password, phone_confirm: true }
      );
      if (updErr) {
        console.error("updateUser:", updErr);
        return jsonResponse({ ok: false, error: "Auth error" }, 500);
      }
    } else {
      console.error("createUser:", createErr);
      return jsonResponse({ ok: false, error: "Auth error" }, 500);
    }
  } else if (!created?.user) {
    return jsonResponse({ ok: false, error: "Auth error" }, 500);
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: signErr } =
    await anon.auth.signInWithPassword({
      email,
      password,
    });

  if (signErr || !sessionData.session) {
    console.error("signInWithPassword:", signErr);
    return jsonResponse({ ok: false, error: "Could not create session" }, 500);
  }

  return jsonResponse({
    ok: true,
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in,
      expires_at: sessionData.session.expires_at,
      token_type: sessionData.session.token_type,
    },
    user: sessionData.user,
  });
});
