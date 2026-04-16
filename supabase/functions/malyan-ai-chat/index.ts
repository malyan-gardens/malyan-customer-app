import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type AiRequest = {
  message?: string;
  conversationId?: string;
  history?: ChatMessage[];
  mode?: "chat" | "design" | "doctor";
  preferences?: Record<string, unknown>;
  image?: {
    base64?: string;
    mediaType?: string;
    imageUrl?: string;
  };
};

type ModelResult = {
  reply: string;
  recommendations: Array<{
    product_name: string;
    product_type: "natural" | "artificial" | "mixed";
    reason: string;
    quantity?: number;
  }>;
  requested_products?: Array<{
    product_name: string;
    description?: string;
  }>;
  diagnosis?: string;
  maintenance_plan?: string[];
  layout_suggestion?: string;
};

type CatalogItem = {
  id: string;
  name_ar: string | null;
  description: string | null;
  selling_price: number | null;
  currency: string | null;
  image_url: string | null;
  category: string | null;
  quantity: number | null;
};

const DAILY_MESSAGE_LIMIT = 20;
const DAILY_COST_LIMIT_USD = 0.1;
const CHAT_MODEL = "claude-haiku-3-5-20251001";
const IMAGE_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are مليان الذكي, an expert garden and landscape consultant for Malyan Gardens in Qatar.
You ONLY discuss:
- Plant care and gardening advice
- Landscape and garden design
- Natural and artificial plant recommendations
- Malyan Gardens products and services
- Maintenance schedules

If asked about ANYTHING else, reply with this exact Arabic sentence:
"أنا متخصص في عالم النباتات والحدائق فقط! كيف أساعدك في تصميم أو العناية بحديقتك؟"

Always respond in the same language as the user message.
Always consider Qatar hot climate in recommendations.
When recommending products, always mention if they are natural or artificial.
Keep answers practical and concise.`;

const RESPONSE_JSON_INSTRUCTIONS = `Return strict JSON only (without markdown):
{
  "reply": "string",
  "layout_suggestion": "string or empty",
  "diagnosis": "string or empty",
  "maintenance_plan": ["short step", "..."],
  "recommendations": [
    {
      "product_name": "string",
      "product_type": "natural|artificial|mixed",
      "reason": "why useful",
      "quantity": 1
    }
  ],
  "requested_products": [
    { "product_name": "string", "description": "optional" }
  ]
}`;

function estimateUsdCost(model: string, inputTokens: number, outputTokens: number): number {
  if (model === CHAT_MODEL) {
    return inputTokens * (0.8 / 1_000_000) + outputTokens * (4 / 1_000_000);
  }
  return inputTokens * (3 / 1_000_000) + outputTokens * (15 / 1_000_000);
}

function clampQty(q: number | undefined): number {
  if (!q || Number.isNaN(q)) return 1;
  return Math.max(1, Math.min(15, Math.floor(q)));
}

function parseModelJson(raw: string): ModelResult {
  const clean = raw.trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const json = start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
  const parsed = JSON.parse(json) as Partial<ModelResult>;
  return {
    reply: String(parsed.reply ?? "").trim(),
    layout_suggestion: parsed.layout_suggestion ? String(parsed.layout_suggestion) : "",
    diagnosis: parsed.diagnosis ? String(parsed.diagnosis) : "",
    maintenance_plan: Array.isArray(parsed.maintenance_plan)
      ? parsed.maintenance_plan.map((s) => String(s)).filter(Boolean)
      : [],
    requested_products: Array.isArray(parsed.requested_products)
      ? parsed.requested_products
          .map((r) => ({
            product_name: String((r as { product_name?: string }).product_name ?? "").trim(),
            description: String((r as { description?: string }).description ?? "").trim(),
          }))
          .filter((r) => r.product_name.length > 0)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
          .map((r) => ({
            product_name: String((r as { product_name?: string }).product_name ?? "").trim(),
            product_type: ((r as { product_type?: string }).product_type ??
              "mixed") as "natural" | "artificial" | "mixed",
            reason: String((r as { reason?: string }).reason ?? "").trim(),
            quantity: clampQty((r as { quantity?: number }).quantity),
          }))
          .filter((r) => r.product_name.length > 0)
      : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json",
      },
    });
  }

  try {
    console.log("Function called");
    console.log("ANTHROPIC_KEY exists:", !!Deno.env.get("ANTHROPIC_API_KEY"));
    console.log("Request method:", req.method);

    if (req.method !== "POST") {
      return jsonResponse({ ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    console.log("[malyan-ai-chat] request", {
      method: req.method,
      hasAuthHeader: Boolean(req.headers.get("authorization")),
      anthropicKeyLen: anthropicKey ? anthropicKey.length : 0,
    });

    if (!supabaseUrl || !anonKey || !serviceKey || !anthropicKey) {
      return jsonResponse(
        { ok: false, code: "MISSING_SERVER_ENV_VARS", error: "Missing server environment variables" },
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("[malyan-ai-chat] authError:", authError);
      return jsonResponse({ ok: false, code: "UNAUTHORIZED", error: "Unauthorized" }, 401);
    }
    const userId = user.id;

    let body: AiRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, code: "INVALID_JSON", error: "Invalid JSON body" }, 400);
    }

    const userMessage = String(body.message ?? "").trim();
    if (!userMessage) {
      return jsonResponse({ ok: false, code: "MESSAGE_REQUIRED", error: "Message is required" }, 400);
    }

  const todayIso = new Date().toISOString().slice(0, 10);
    const { data: usageRow, error: usageReadError } = await admin
      .from("ai_daily_usage")
      .select("message_count,cost_usd")
      .eq("user_id", userId)
      .eq("date", todayIso)
      .maybeSingle();
    if (usageReadError) {
      console.error("[malyan-ai-chat] usageReadError:", usageReadError);
      return jsonResponse({ ok: false, code: "USAGE_READ_FAILED", error: "Failed to read usage limits" }, 500);
    }

    const usedMessages = Number(usageRow?.message_count ?? 0);
    const usedCost = Number(usageRow?.cost_usd ?? 0);
    console.log("[malyan-ai-chat] usage", { usedMessages, usedCost, today: todayIso });

    if (usedMessages >= DAILY_MESSAGE_LIMIT) {
      return jsonResponse(
        { ok: false, code: "DAILY_MESSAGES_EXCEEDED", error: "Daily message limit reached", remaining_messages: 0 },
        429
      );
    }
    if (usedCost >= DAILY_COST_LIMIT_USD) {
      return jsonResponse(
        { ok: false, code: "DAILY_BUDGET_EXCEEDED", error: "Daily budget limit reached", remaining_budget_usd: 0 },
        429
      );
    }

    const hasImage = Boolean(body.image?.base64);
    const model = hasImage ? IMAGE_MODEL : CHAT_MODEL;

    const { data: catalogRows, error: catalogErr } = await admin
      .from("inventory")
      .select("id,name_ar,description,selling_price,currency,image_url,category,quantity")
      .gt("quantity", 0)
      .order("quantity", { ascending: false })
      .limit(200);
    if (catalogErr) {
      console.error("[malyan-ai-chat] catalogErr:", catalogErr);
    }
    const catalog = (catalogRows ?? []) as CatalogItem[];

  const catalogSummary = catalog
    .slice(0, 40)
    .map(
      (p) =>
        `- ${p.name_ar ?? "منتج"} | category=${p.category ?? "عام"} | price=${p.selling_price ?? 0} ${
          p.currency ?? "QAR"
        }`
    )
    .join("\n");

  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const historyText = history.map((m) => `${m.role}: ${m.content}`).join("\n");

  const userContext = [
    body.mode ? `Mode: ${body.mode}` : "",
    body.preferences ? `Preferences: ${JSON.stringify(body.preferences)}` : "",
    body.image?.imageUrl ? `Image URL: ${body.image.imageUrl}` : "",
    historyText ? `Conversation history:\n${historyText}` : "",
    `Inventory snapshot:\n${catalogSummary}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const contentParts: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `${RESPONSE_JSON_INSTRUCTIONS}\n\nUser context:\n${userContext}\n\nUser message:\n${userMessage}`,
    },
  ];

  if (hasImage && body.image?.base64) {
    contentParts.unshift({
      type: "image",
      source: {
        type: "base64",
        media_type: body.image.mediaType ?? "image/jpeg",
        data: body.image.base64,
      },
    });
  }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: contentParts }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("malyan-ai-chat anthropic error:", anthropicRes.status, errText);
      return jsonResponse(
        { ok: false, code: "ANTHROPIC_ERROR", error: "AI service unavailable" },
        502
      );
    }

    const anthropicJson = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const outputText =
      anthropicJson.content?.find((c) => c.type === "text" && c.text)?.text?.trim() ?? "";

    let modelParsed: ModelResult;
    try {
      modelParsed = parseModelJson(outputText);
    } catch (parseErr) {
      console.error("[malyan-ai-chat] parseModelJson error:", parseErr);
      modelParsed = {
        reply:
          outputText ||
          "أنا متخصص في عالم النباتات والحدائق فقط! كيف أساعدك في تصميم أو العناية بحديقتك؟",
        recommendations: [],
        maintenance_plan: [],
        requested_products: [],
      };
    }

  const normalizedRecommendations: Array<Record<string, unknown>> = [];
  let estimatedProductsCost = 0;

  for (const rec of modelParsed.recommendations.slice(0, 8)) {
    const qty = clampQty(rec.quantity);

    const { data: exactMatches } = await admin
      .from("inventory")
      .select("id,name_ar,description,selling_price,currency,image_url,category,quantity")
      .ilike("name_ar", `%${rec.product_name}%`)
      .gt("quantity", 0)
      .order("quantity", { ascending: false })
      .limit(1);

    let matched = (exactMatches?.[0] as CatalogItem | undefined) ?? null;
    let alternative: CatalogItem | null = null;

    if (!matched) {
      const naturalKw = ["طبيعي", "عضوي", "natural", "organic"];
      const artificialKw = ["صناعي", "اصطناعي", "artificial", "plastic"];

      const keywords: string[] =
        rec.product_type === "natural"
          ? naturalKw
          : rec.product_type === "artificial"
            ? artificialKw
            : [...naturalKw, ...artificialKw];

      // Try to find a close available product by natural/artificial hint keywords in catalog columns.
      for (const kw of keywords) {
        const { data: alternatives } = await admin
          .from("inventory")
          .select("id,name_ar,description,selling_price,currency,image_url,category,quantity")
          .or(
            `category.ilike.%${kw}%,description.ilike.%${kw}%,name_ar.ilike.%${kw}%`
          )
          .gt("quantity", 0)
          .order("quantity", { ascending: false })
          .limit(1);

        alternative = (alternatives?.[0] as CatalogItem | undefined) ?? null;
        if (alternative) break;
      }

      // Fallback: partial token match from product name.
      if (!alternative) {
        const firstToken = rec.product_name
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean)[0];
        if (firstToken) {
          const { data: alternatives } = await admin
            .from("inventory")
            .select("id,name_ar,description,selling_price,currency,image_url,category,quantity")
            .ilike("name_ar", `%${firstToken}%`)
            .or(
              `description.ilike.%${firstToken}%,category.ilike.%${firstToken}%`
            )
            .gt("quantity", 0)
            .order("quantity", { ascending: false })
            .limit(1);
          alternative = (alternatives?.[0] as CatalogItem | undefined) ?? null;
        }
      }
    } else {
      estimatedProductsCost += (matched.selling_price ?? 0) * qty;
    }

    normalizedRecommendations.push({
      requested_name: rec.product_name,
      reason: rec.reason,
      product_type: rec.product_type,
      quantity: qty,
      available: Boolean(matched || alternative),
      matched_product: matched,
      alternative_product: alternative,
    });
  }

  const inputTokens = Number(anthropicJson.usage?.input_tokens ?? 0);
  const outputTokens = Number(anthropicJson.usage?.output_tokens ?? 0);
  const requestCost = estimateUsdCost(model, inputTokens, outputTokens);
  const nextCost = usedCost + requestCost;
  const nextMessageCount = usedMessages + 1;

    const { error: usageUpsertErr } = await admin.from("ai_daily_usage").upsert(
      {
        user_id: userId,
        date: todayIso,
        message_count: nextMessageCount,
        cost_usd: Number(nextCost.toFixed(4)),
      },
      { onConflict: "user_id,date" }
    );
    if (usageUpsertErr) {
      console.error("[malyan-ai-chat] usageUpsertErr:", usageUpsertErr);
    }

  const nowIso = new Date().toISOString();
  const savedHistory = [
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at ?? nowIso,
    })),
    { role: "user", content: userMessage, created_at: nowIso },
    {
      role: "assistant",
      content: modelParsed.reply,
      created_at: nowIso,
      recommendations: normalizedRecommendations,
      diagnosis: modelParsed.diagnosis ?? "",
      layout_suggestion: modelParsed.layout_suggestion ?? "",
      maintenance_plan: modelParsed.maintenance_plan ?? [],
      requested_products: modelParsed.requested_products ?? [],
    },
  ];

  const convoPayload = {
    user_id: userId,
    conversation_type: body.mode ?? "chat",
    title: userMessage.slice(0, 80),
    messages: savedHistory,
    metadata: {
      layout_suggestion: modelParsed.layout_suggestion ?? "",
      diagnosis: modelParsed.diagnosis ?? "",
      maintenance_plan: modelParsed.maintenance_plan ?? [],
      recommendations: normalizedRecommendations,
      preferences: body.preferences ?? {},
    },
    last_model: model,
    estimated_cost_usd: Number(requestCost.toFixed(6)),
  };

  let conversationId = body.conversationId ?? "";
    if (conversationId) {
      const { error: updateErr } = await admin
        .from("ai_conversations")
        .update(convoPayload)
        .eq("id", conversationId)
        .eq("user_id", userId);
      if (updateErr) {
        console.error("[malyan-ai-chat] conversation update error:", updateErr);
        conversationId = "";
      }
    }
    if (!conversationId) {
      const { data: inserted, error: insertErr } = await admin
        .from("ai_conversations")
        .insert(convoPayload)
        .select("id")
        .single();
      if (insertErr) {
        console.error("[malyan-ai-chat] conversation insert error:", insertErr);
        conversationId = "";
      } else if (inserted?.id) {
        conversationId = inserted.id as string;
      }
    }

    return jsonResponse({
      ok: true,
      conversation_id: conversationId,
      reply: modelParsed.reply,
      recommendations: normalizedRecommendations,
      requested_products: modelParsed.requested_products ?? [],
      diagnosis: modelParsed.diagnosis ?? "",
      layout_suggestion: modelParsed.layout_suggestion ?? "",
      maintenance_plan: modelParsed.maintenance_plan ?? [],
      estimated_products_cost_qr: Number(estimatedProductsCost.toFixed(2)),
      usage: {
        model,
        request_cost_usd: Number(requestCost.toFixed(6)),
        daily_cost_usd: Number(nextCost.toFixed(4)),
        daily_message_count: nextMessageCount,
        remaining_messages: Math.max(0, DAILY_MESSAGE_LIMIT - nextMessageCount),
        remaining_budget_usd: Number(
          Math.max(0, DAILY_COST_LIMIT_USD - nextCost).toFixed(4)
        ),
        budget_limit_usd: DAILY_COST_LIMIT_USD,
      },
    });
  } catch (err) {
    console.error("[malyan-ai-chat] unexpected error:", err);
    return jsonResponse({ ok: false, code: "INTERNAL_ERROR", error: "Internal server error" }, 500);
  }
});
