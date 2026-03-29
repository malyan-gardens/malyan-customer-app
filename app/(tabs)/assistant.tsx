import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing } from "../../lib/theme";
import type { InventoryRow } from "../../lib/types";
import { supabase } from "../../lib/supabase";

type ChatRole = "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string };

const MODEL = "claude-sonnet-4-20250514";
const API_URL = "https://api.anthropic.com/v1/messages";

const BASE_SYSTEM = `أنت مساعد ذكي لشركة مليان للحدائق في قطر. 
الشركة متخصصة في النباتات الاصطناعية الفاخرة والصيانة وتصميم المساحات.
تحدث بالعربية دائماً. كن ودوداً ومفيداً.
المنتجات المتاحة: نباتات اصطناعية بأحجام مختلفة من 35cm إلى 140cm.
الأسعار تبدأ من 39 QAR.
للتواصل: info@malyangardens.com | +974 50963373`;

function buildSystemPrompt(opts: {
  from?: string;
  productName?: string;
  productId?: string;
  initialContext?: string;
}): string {
  let extra = "";
  if (opts.from === "product" && (opts.productName || opts.productId)) {
    const name = opts.productName ?? "منتج محدد";
    extra += `\nالعميل يشاهد منتجاً محدداً: ${name}. اذكر هذا المنتج عند المناسبة وساعد في الأسئلة عنه والتوصية به.`;
  }
  if (opts.from === "maintenance") {
    extra += `\nالعميل جاء من صفحة الصيانة. ركّز على خدمات الصيانة والإجابة عن المشاكل وطلبات الزيارة.`;
  }
  if (opts.from === "design") {
    extra += `\nالعميل جاء من صفحة تصميم المساحات. ساعده في اختيار الأنماط، الميزانية، والنباتات المناسبة لمساحته.`;
  }
  if (opts.initialContext?.trim()) {
    extra += `\n\nسياق إضافي من التطبيق:\n${opts.initialContext.trim()}`;
  }
  return BASE_SYSTEM + extra;
}

async function callClaude(
  apiKey: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system,
      messages,
    }),
  });

  const json = (await res.json()) as {
    content?: { type: string; text: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? res.statusText ?? "طلب غير ناجح");
  }

  const block = json.content?.find((c) => c.type === "text");
  const text = block?.text?.trim();
  if (!text) throw new Error("لم يُرجع النموذج نصاً.");
  return text;
}

export default function AssistantTabScreen() {
  const params = useGlobalSearchParams<{
    from?: string;
    productId?: string;
    productName?: string;
    initialContext?: string;
  }>();

  const from = typeof params.from === "string" ? params.from : undefined;
  const productId = typeof params.productId === "string" ? params.productId : undefined;
  const productNameParam =
    typeof params.productName === "string" ? params.productName : undefined;
  const initialContext =
    typeof params.initialContext === "string" ? params.initialContext : undefined;

  const [resolvedProductName, setResolvedProductName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const productName = productNameParam ?? resolvedProductName ?? undefined;

  useEffect(() => {
    if (from !== "product" || !productId || productNameParam) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("inventory")
        .select("name_ar")
        .eq("id", productId)
        .maybeSingle();
      const row = data as Pick<InventoryRow, "name_ar"> | null;
      if (!cancelled && row?.name_ar) setResolvedProductName(row.name_ar);
    })();
    return () => {
      cancelled = true;
    };
  }, [from, productId, productNameParam]);

  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt({
        from,
        productId,
        productName,
        initialContext,
      }),
    [from, productId, productName, initialContext]
  );

  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? "";

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey) {
      setApiError("مفتاح API غير مضبوط. أضف EXPO_PUBLIC_CLAUDE_API_KEY في البيئة.");
      return;
    }

    setApiError(null);
    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToEnd();

    const anthropicMessages = next.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const reply = await callClaude(apiKey, systemPrompt, anthropicMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع.";
      setApiError(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [apiKey, input, loading, messages, scrollToEnd, systemPrompt]);

  let contextLine = "مساعد مليان الذكي";
  if (from === "product" && productId) {
    contextLine = productName ? `منتج: ${productName}` : "سياق: منتج";
  } else if (from === "maintenance") {
    contextLine = "الصيانة";
  } else if (from === "design") {
    contextLine = "تصميم المساحات";
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 المساعد</Text>
        <Text style={styles.sub}>{contextLine}</Text>
      </View>

      {apiError ? (
        <View style={styles.bannerErr}>
          <Ionicons name="warning-outline" size={18} color={colors.red400} />
          <Text style={styles.bannerErrText}>{apiError}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.welcome}>
              <Ionicons name="sparkles" size={40} color={colors.gold} />
              <Text style={styles.welcomeText}>
                مرحباً! اسألني عن النباتات، الصيانة، أو التصميم.
              </Text>
            </View>
          ) : null}
          {messages.map((m, i) => (
            <View
              key={`${i}-${m.role}`}
              style={[
                styles.bubbleWrap,
                m.role === "user" ? styles.bubbleUser : styles.bubbleAi,
              ]}
            >
              <View style={[styles.bubble, m.role === "user" ? styles.bubbleUserInner : styles.bubbleAiInner]}>
                <Text
                  style={[
                    styles.bubbleText,
                    m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAi,
                  ]}
                >
                  {m.content}
                </Text>
              </View>
            </View>
          ))}
          {loading ? (
            <View style={[styles.bubbleWrap, styles.bubbleAi]}>
              <View style={[styles.bubble, styles.bubbleAiInner, styles.typing]}>
                <ActivityIndicator size="small" color={colors.gold} />
                <Text style={styles.typingText}>يكتب…</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="اكتب رسالتك…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            textAlign="right"
          />
          <Pressable
            onPress={send}
            disabled={loading || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
              pressed && { opacity: 0.88 },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Ionicons name="send" size={22} color={colors.bg} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "right",
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: "right",
  },
  bannerErr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
  },
  bannerErrText: { flex: 1, color: colors.red400, fontSize: 13, textAlign: "right" },
  chatScroll: { flex: 1 },
  chatContent: { padding: spacing.md, paddingBottom: 24 },
  welcome: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  welcomeText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bubbleWrap: {
    marginBottom: 12,
    maxWidth: "88%",
  },
  bubbleUser: { alignSelf: "flex-end" },
  bubbleAi: { alignSelf: "flex-start" },
  bubble: {
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bubbleUserInner: {
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  bubbleAiInner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  bubbleText: { fontSize: 15, lineHeight: 24 },
  bubbleTextUser: { color: colors.white, textAlign: "right" },
  bubbleTextAi: { color: colors.textSecondary, textAlign: "right" },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typingText: { color: colors.textMuted, fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.goldGlow,
  },
  sendBtnDisabled: { opacity: 0.45 },
});
