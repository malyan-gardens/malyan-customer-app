import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type AiConversation = {
  id: string;
  user_id: string;
  conversation_type: string;
  title: string | null;
  messages: Array<{ role: string; content: string; created_at?: string }> | null;
  created_at: string;
  updated_at: string;
};

type AiDailyUsage = {
  user_id: string;
  date: string;
  message_count: number;
  cost_usd: number;
  created_at: string;
};

type AiProductRequest = {
  id: string;
  user_id: string;
  product_name: string;
  description: string | null;
  created_at: string;
};

function formatUSD(n: number) {
  try {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n) + " $";
  } catch {
    return String(n);
  }
}

function formatDateAr(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AiDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [dailyUsage, setDailyUsage] = useState<AiDailyUsage[]>([]);
  const [productRequests, setProductRequests] = useState<AiProductRequest[]>([]);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, uRes, rRes] = await Promise.all([
        supabase
          .from("ai_conversations")
          .select("id,user_id,conversation_type,title,messages,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(30),
        supabase
          .from("ai_daily_usage")
          .select("user_id,date,message_count,cost_usd,created_at")
          .order("date", { ascending: false })
          .limit(60),
        supabase
          .from("ai_product_requests")
          .select("id,user_id,product_name,description,created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (cRes.error) throw cRes.error;
      if (uRes.error) throw uRes.error;
      if (rRes.error) throw rRes.error;

      setConversations((cRes.data as AiConversation[]) ?? []);
      setDailyUsage((uRes.data as AiDailyUsage[]) ?? []);
      setProductRequests((rRes.data as AiProductRequest[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل بيانات مليان الذكي.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAll();
  }, []);

  const analytics = useMemo(() => {
    const counts = new Map<string, number>();

    conversations.forEach((c) => {
      const lastUser = (c.messages ?? []).slice().reverse().find((m) => m.role === "user");
      if (!lastUser?.content) return;
      const key = lastUser.content.trim().slice(0, 80);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([question, count]) => ({ question, count }));

    const totalCost = dailyUsage.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
    const totalMessages = dailyUsage.reduce((s, r) => s + Number(r.message_count ?? 0), 0);

    return { top, totalCost, totalMessages };
  }, [conversations, dailyUsage]);

  return (
    <div
      style={{
        padding: 28,
        direction: "rtl",
        fontFamily: "Cairo, Tajawal, sans-serif",
        color: "#e8f0ea",
        background: "#080e0a",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, marginBottom: 16 }}>🤖 مليان الذكي</h1>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#4a6450" }}>⏳ جاري التحميل…</div>
      ) : error ? (
        <div style={{ padding: 16, color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ background: "#0f1a12", border: "1px solid #2a3d2e", borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>تكلفة مليان الذكي</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#c9a84c" }}>
            {formatUSD(analytics.totalCost)}
          </div>
          <div style={{ fontSize: 13, color: "#7a9480", marginTop: 6 }}>
            إجمالي رسائل (ضمن البيانات المحمّلة): {analytics.totalMessages}
          </div>
        </div>

        <div style={{ background: "#0f1a12", border: "1px solid #2a3d2e", borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>أسئلة الأكثر تكراراً</div>
          <div style={{ color: "#7a9480", fontSize: 13, whiteSpace: "pre-line" }}>
            {analytics.top.length === 0 ? "—" : null}
            {analytics.top.map((t, i) => (
              <div key={`${t.question}-${i}`} style={{ marginBottom: 10 }}>
                <span style={{ color: "#e8f0ea", fontWeight: 800 }}>{t.count}× </span>
                <span style={{ color: "#7a9480" }}>{t.question}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, marginTop: 16 }}>
        <div style={{ background: "#0f1a12", border: "1px solid #2a3d2e", borderRadius: 14, padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, marginBottom: 12 }}>آخر المحادثات</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "right" }}>
              <thead>
                <tr>
                  <th style={{ paddingBottom: 10, fontWeight: 900 }}>العنوان</th>
                  <th style={{ paddingBottom: 10, fontWeight: 900 }}>المستخدم</th>
                  <th style={{ paddingBottom: 10, fontWeight: 900 }}>التحديث</th>
                  <th style={{ paddingBottom: 10, fontWeight: 900 }}>النوع</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid rgba(42,61,46,0.6)" }}>
                    <td style={{ padding: "10px 0", color: "#e8f0ea", fontWeight: 800 }}>
                      {c.title ?? "—"}
                    </td>
                    <td style={{ padding: "10px 0", color: "#7a9480", fontSize: 13 }}>
                      {c.user_id.slice(0, 10)}…
                    </td>
                    <td style={{ padding: "10px 0", color: "#7a9480", fontSize: 13 }}>
                      {formatDateAr(c.updated_at)}
                    </td>
                    <td style={{ padding: "10px 0", color: "#7a9480", fontSize: 13 }}>
                      {c.conversation_type}
                    </td>
                  </tr>
                ))}
                {conversations.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "#7a9480" }}>
                      لا توجد بيانات.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0f1a12", border: "1px solid #2a3d2e", borderRadius: 14, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, marginBottom: 12 }}>استخدام اليوم (تكلفة ورسائل)</h2>
            <div style={{ color: "#7a9480", fontSize: 13 }}>
              {dailyUsage.slice(0, 10).map((r, i) => (
                <div key={`${r.user_id}-${r.date}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, color: "#e8f0ea" }}>{r.date}</span>
                  <span>{r.message_count} رسائل</span>
                  <span style={{ color: "#c9a84c", fontWeight: 900 }}>{formatUSD(Number(r.cost_usd ?? 0))}</span>
                </div>
              ))}
              {dailyUsage.length === 0 ? "—" : null}
            </div>
          </div>

          <div style={{ background: "#0f1a12", border: "1px solid #2a3d2e", borderRadius: 14, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, marginBottom: 12 }}>طلبات منتجات غير متوفرة</h2>
            <div style={{ color: "#7a9480", fontSize: 13 }}>
              {productRequests.slice(0, 10).map((r) => (
                <div key={r.id} style={{ borderTop: "1px solid rgba(42,61,46,0.6)", paddingTop: 10, marginTop: 10 }}>
                  <div style={{ color: "#e8f0ea", fontWeight: 900 }}>{r.product_name}</div>
                  <div style={{ marginTop: 6 }}>{r.description ?? "—"}</div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>{formatDateAr(r.created_at)}</div>
                </div>
              ))}
              {productRequests.length === 0 ? "—" : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

