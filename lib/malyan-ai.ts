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
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_ANTHROPIC_API_KEY");
  }

  const SYSTEM_PROMPT = `أنت مليان الذكي، مستشار متخصص في النباتات والحدائق لشركة مليان للحدائق في قطر.
تتحدث فقط عن: النباتات، تصميم الحدائق، الصيانة، منتجات مليان.
إذا سُئلت عن أي موضوع آخر قل: "أنا متخصص في عالم النباتات والحدائق فقط!"
دائماً رد بنفس لغة المستخدم.`;

  // Prefer a multimodal model when we have an image.
  const model = payload.image?.base64 ? "claude-sonnet-4-6" : "claude-haiku-4-5";

  const history = payload.history?.length
    ? payload.history.map((h) => ({
        role: h.role,
        content: h.content,
      }))
    : [];

  const imageBase64 = payload.image?.base64;
  const userContent = imageBase64
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: payload.image?.mediaType ?? "image/jpeg",
            data: imageBase64,
          },
        },
        { type: "text", text: payload.message },
      ]
    : payload.message;

  const messages =
    history.length > 0
      ? [...history, { role: "user", content: userContent }]
      : [{ role: "user", content: userContent }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  const data = await response.json();
  const reply: string = data?.content?.[0]?.text ?? "عذراً، حدث خطأ.";

  if (!response.ok) {
    throw new Error(reply);
  }

  return {
    conversationId: payload.conversationId ?? "",
    reply,
    recommendations: [],
    diagnosis: "",
    layoutSuggestion: "",
    maintenancePlan: [],
    requestedProducts: [],
    estimatedProductsCostQar: 0,
    usage: null,
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
