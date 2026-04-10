import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;

function randomSixDigit(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

function normalizeE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed.startsWith("+")) return null;
  const digits = trimmed.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
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
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromWa = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const contentSid = Deno.env.get("TWILIO_CONTENT_SID");

  if (
    !supabaseUrl ||
    !serviceKey ||
    !accountSid ||
    !authToken ||
    !fromWa ||
    !contentSid
  ) {
    console.error("send-whatsapp-otp: missing env configuration");
    return jsonResponse(
      { ok: false, error: "Server configuration error" },
      500
    );
  }

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  const phone = normalizeE164(String(body.phone ?? ""));
  if (!phone) {
    return jsonResponse({ ok: false, error: "Invalid phone number" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await admin
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", hourAgo);

  if (countErr) {
    console.error("otp count:", countErr);
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  if ((count ?? 0) >= MAX_SENDS_PER_HOUR) {
    return jsonResponse(
      { ok: false, error: "Too many requests. Try again later." },
      429
    );
  }

  await admin
    .from("otp_codes")
    .delete()
    .eq("phone", phone)
    .is("consumed_at", null);

  const code = randomSixDigit();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error: insErr } = await admin.from("otp_codes").insert({
    phone,
    code,
    expires_at: expiresAt,
  });

  if (insErr) {
    console.error("otp insert:", insErr);
    return jsonResponse({ ok: false, error: "Failed to store OTP" }, 500);
  }

  const toWhatsApp = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  const fromNorm = fromWa.startsWith("whatsapp:") ? fromWa : `whatsapp:${fromWa.replace(/^whatsapp:/i, "")}`;

  const params = new URLSearchParams({
    To: toWhatsApp,
    From: fromNorm,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify({ "1": code }),
  });

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  const twilioText = await twilioRes.text();
  if (!twilioRes.ok) {
    console.error("Twilio error:", twilioRes.status, twilioText);
    await admin.from("otp_codes").delete().eq("phone", phone).eq("code", code);
    return jsonResponse(
      { ok: false, error: "Failed to send WhatsApp message" },
      502
    );
  }

  return jsonResponse({ ok: true, expiresAt });
});
