import { describeFunctionInvokeError } from "./function-invoke-error";
import { supabase } from "./supabase";

export type ChatRole = "user" | "assistant";

export type ChatUiMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  recommendations?: AiRecommendation[];
  usage?: AiUsage;
};

export type AiRecommendation = {
  requested_name: string;
  reason: string;
  product_type: "natural" | "artificial" | "mixed";
  quantity: number;
  available: boolean;
  matched_product: ProductLike | null;
  alternative_product: ProductLike | null;
};

export type ProductLike = {
  id: string;
  name_ar: string | null;
  description: string | null;
  selling_price: number | null;
  currency: string | null;
  image_url: string | null;
  category: string | null;
  quantity: number | null;
};

export type AiUsage = {
  model: string;
  request_cost_usd: number;
  daily_cost_usd: number;
  daily_message_count: number;
  remaining_messages: number;
  remaining_budget_usd: number;
  budget_limit_usd: number;
};

export type InvokeAiPayload = {
  message: string;
  userId?: string;
  conversationId?: string;
  history?: Array<{ role: ChatRole; content: string; created_at?: string }>;
  mode?: "chat" | "design" | "doctor";
  preferences?: Record<string, unknown>;
  image?: {
    base64?: string;
    mediaType?: string;
    imageUrl?: string;
  };
};

export type InvokeAiResult = {
  conversationId: string;
  reply: string;
  recommendations: AiRecommendation[];
  diagnosis: string;
  layoutSuggestion: string;
  maintenancePlan: string[];
  requestedProducts: Array<{ product_name: string; description?: string }>;
  estimatedProductsCostQar: number;
  usage: AiUsage | null;
};

export async function invokeMalyanAi(payload: InvokeAiPayload): Promise<InvokeAiResult> {
  const userId = payload.userId?.trim();
  if (!userId) {
    throw new Error("User ID is required");
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env vars");
  }

  const reqBody = {
    message: payload.message,
    userId,
    imageBase64: payload.image?.base64 ?? null,
    history: payload.history ?? [],
    plantType: payload.preferences?.plant_nature ?? null,
    conversationId: payload.conversationId,
    mode: payload.mode,
    preferences: payload.preferences,
    image: payload.image,
  };

  let data: any;
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/malyan-ai-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(reqBody),
      }
    );
    data = await response.json();
    if (!response.ok) {
      const code = typeof data?.code === "string" ? data.code : "";
      const fallback =
        typeof data?.error === "string" && data.error.length > 0
          ? data.error
          : "تعذر الوصول لمليان الذكي حالياً.";
      throw new Error(code ? `${code}: ${fallback}` : fallback);
    }
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      describeFunctionInvokeError(err) || "تعذر الاتصال بخدمة مليان الذكي."
    );
  }

  if (!data?.ok) {
    const code = typeof data.code === "string" ? data.code : "";
    const fallback =
      typeof data.error === "string" && data.error.length > 0
        ? data.error
        : "تعذر الوصول لمليان الذكي حالياً.";
    throw new Error(code ? `${code}: ${fallback}` : fallback);
  }

  return {
    conversationId: String(data.conversation_id ?? ""),
    reply: String(data.reply ?? ""),
    recommendations: (data.recommendations ?? []) as AiRecommendation[],
    diagnosis: String(data.diagnosis ?? ""),
    layoutSuggestion: String(data.layout_suggestion ?? ""),
    maintenancePlan: Array.isArray(data.maintenance_plan)
      ? data.maintenance_plan.map((x: unknown) => String(x))
      : [],
    requestedProducts: Array.isArray(data.requested_products)
      ? data.requested_products
      : [],
    estimatedProductsCostQar: Number(data.estimated_products_cost_qr ?? 0),
    usage: (data.usage ?? null) as AiUsage | null,
  };
}

export async function getLatestConversation(
  mode: "chat" | "design" | "doctor" = "chat"
): Promise<{
  id: string;
  messages: ChatUiMessage[];
} | null> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id,messages")
    .eq("conversation_type", mode)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return {
    id: String(data.id),
    messages: messages.map((m: Record<string, unknown>, idx: number) => ({
      id: String(m.id ?? `${idx}-${m.created_at ?? ""}`),
      role: (m.role === "assistant" ? "assistant" : "user") as ChatRole,
      content: String(m.content ?? ""),
      createdAt: String(m.created_at ?? new Date().toISOString()),
      recommendations: Array.isArray(m.recommendations)
        ? (m.recommendations as AiRecommendation[])
        : undefined,
    })),
  };
}

export async function getTodayAiUsage(): Promise<AiUsage | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ai_daily_usage")
    .select("message_count,cost_usd")
    .eq("date", today)
    .maybeSingle();
  if (!data) return null;
  const messageCount = Number(data.message_count ?? 0);
  const dailyCost = Number(data.cost_usd ?? 0);
  return {
    model: "claude-haiku-3-5-20251001",
    request_cost_usd: 0,
    daily_cost_usd: dailyCost,
    daily_message_count: messageCount,
    remaining_messages: Math.max(0, 20 - messageCount),
    remaining_budget_usd: Math.max(0, 0.1 - dailyCost),
    budget_limit_usd: 0.1,
  };
}

export async function requestUnavailableProduct(
  productName: string,
  description: string
): Promise<void> {
  const { error } = await supabase.from("ai_product_requests").insert({
    product_name: productName,
    description,
  });
  if (error) throw new Error(error.message);
}

export async function saveAiDesign(
  title: string,
  preferences: Record<string, unknown>,
  proposal: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("ai_saved_designs").insert({
    title,
    preferences,
    proposal,
  });
  if (error) throw new Error(error.message);
}

export async function listAiDesigns(): Promise<
  Array<{
    id: string;
    title: string;
    preferences: Record<string, unknown>;
    proposal: Record<string, unknown>;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("ai_saved_designs")
    .select("id,title,preferences,proposal,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    title: string;
    preferences: Record<string, unknown>;
    proposal: Record<string, unknown>;
    created_at: string;
  }>;
}
