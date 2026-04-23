import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useCartStore } from "../store/cartStore";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";

const QNB_BLUE = "#003f7f";
const font = Platform.select({ web: "Cairo, Tajawal, sans-serif", default: undefined });

const SEND_INVOICE_EMAIL_URL = "https://app.malyangardens.com/api/send-invoice-email";
const INVOICE_FETCH_DELAY_MS = 3000;

function waitMs(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function parseInvoiceItemsForEmail(items: unknown): Array<{
  name: string;
  quantity: number;
  lineTotal: number;
  currency: string;
}> {
  if (!Array.isArray(items)) return [];
  return items.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      name: String(r.name ?? r.description ?? "منتج"),
      quantity: Number(r.quantity ?? r.qty ?? 1),
      lineTotal: Number(r.lineTotal ?? r.amount ?? 0),
      currency: String(r.currency ?? "QAR"),
    };
  });
}

function buildInvoiceEmailHtml(input: {
  invoiceNumber: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number; lineTotal: number; currency: string }>;
  total: number;
  paymentMethod: string;
  issuedDate: string;
}): string {
  const rows = input.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border:1px solid #ddd;">${i.name}</td><td style="padding:8px;border:1px solid #ddd;">${i.quantity}</td><td style="padding:8px;border:1px solid #ddd;">${i.lineTotal.toFixed(2)} ${i.currency}</td></tr>`
    )
    .join("");
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
      <h2>فاتورة طلبك من مليان للحدائق</h2>
      <p><strong>رقم الفاتورة:</strong> ${input.invoiceNumber}</p>
      <p><strong>رقم الطلب:</strong> ${input.orderId}</p>
      <p><strong>العميل:</strong> ${input.customerName}</p>
      <p><strong>الهاتف:</strong> ${input.customerPhone || "—"}</p>
      <p><strong>تاريخ الإصدار:</strong> ${input.issuedDate || "—"}</p>
      <p><strong>طريقة الدفع:</strong> ${input.paymentMethod}</p>
      <table style="border-collapse:collapse;width:100%">
        <thead><tr><th style="padding:8px;border:1px solid #ddd;">المنتج</th><th style="padding:8px;border:1px solid #ddd;">الكمية</th><th style="padding:8px;border:1px solid #ddd;">الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>المجموع:</strong> ${input.total.toFixed(2)} QAR</p>
      <p>شكراً لثقتكم بمليان للحدائق</p>
    </div>
  `;
}

async function postSendInvoiceEmail(invoice: Record<string, unknown>, orderId: string) {
  const invoiceNumber = String(invoice.invoice_number ?? "—");
  const to = String(invoice.customer_email ?? "").trim();
  const html = buildInvoiceEmailHtml({
    invoiceNumber,
    orderId,
    customerName: String(invoice.customer_name ?? "عميل"),
    customerPhone: String(invoice.customer_phone ?? ""),
    items: parseInvoiceItemsForEmail(invoice.items),
    total: Number(invoice.total_amount ?? 0),
    paymentMethod: String(invoice.payment_method ?? "أونلاين"),
    issuedDate: String(invoice.issued_date ?? ""),
  });

  const res = await fetch(SEND_INVOICE_EMAIL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice,
      to,
      subject: `فاتورة ${invoiceNumber} — مليان للحدائق`,
      html,
    }),
  });
  console.log("[payment-mock] send-invoice-email status:", res.status);
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentMockScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    service?: string;
    orderId?: string;
  }>();
  const amount = Number(params.amount ?? 0);
  const service = String(params.service ?? "خدمة صيانة");

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmPayment = async () => {
    setLoading(true);

    const orderIdRaw = params.orderId;
    const orderIdStr =
      typeof orderIdRaw === "string"
        ? orderIdRaw
        : Array.isArray(orderIdRaw)
          ? orderIdRaw[0]
          : "";

    if (orderIdStr) {
      try {
        const orderId = orderIdStr;
        console.log("Updating orderId:", orderId, typeof orderId);
        const { error } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderId);
        console.log("Update result error:", error);
        if (error) throw error;

        await waitMs(INVOICE_FETCH_DELAY_MS);

        const { data: invoice, error: invErr } = await supabase
          .from("invoices")
          .select("*")
          .eq("reference_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invErr) {
          console.log("[payment-mock] invoice fetch error:", invErr);
        } else if (invoice) {
          try {
            await postSendInvoiceEmail(invoice as Record<string, unknown>, orderId);
          } catch (emailErr) {
            console.log("[payment-mock] send-invoice-email failed:", emailErr);
          }
        } else {
          console.log("[payment-mock] no invoice for reference_id:", orderId);
        }

        useCartStore.getState().clear();
        useCheckoutDraftStore.getState().reset();
        router.replace({
          pathname: "/order-success",
          params: { orderId, total: String(amount) },
        });
        return;
      } catch (e) {
        console.error("PATH A ERROR:", e instanceof Error ? e.message : JSON.stringify(e));
        console.log(e);
        setLoading(false);
      }
      return;
    }

    try {
      const body = `تم استلام ${amount} QAR مقابل ${service}`;
      await supabase.from("notifications").insert({
        title: "دفع إلكتروني ناجح",
        body,
        type: "order",
      });
    } catch (e) {
      console.log(e);
    }

    useCartStore.getState().clear();
    useCheckoutDraftStore.getState().reset();
    setLoading(false);
    router.replace({
      pathname: "/order-success",
      params: { total: String(amount) },
    });
    return;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.qnbText}>QNB</Text>
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>بوابة الدفع الإلكتروني - QNB</Text>
        <Text style={styles.amount}>المبلغ: {amount} QAR</Text>
        <Text style={styles.service}>{service}</Text>

        <Text style={styles.label}>Card Number</Text>
        <TextInput
          value={cardNumber}
          onChangeText={(t) => setCardNumber(formatCardNumber(t))}
          placeholder="XXXX XXXX XXXX XXXX"
          style={styles.input}
          keyboardType="number-pad"
          maxLength={19}
        />

        <Text style={styles.label}>Cardholder Name</Text>
        <TextInput
          value={cardholderName}
          onChangeText={setCardholderName}
          placeholder="Name on card"
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              value={expiry}
              onChangeText={(t) => setExpiry(formatExpiry(t))}
              placeholder="MM/YY"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              value={cvv}
              onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 3))}
              placeholder="***"
              style={styles.input}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={3}
            />
          </View>
        </View>

        <Pressable style={styles.payBtn} onPress={() => void confirmPayment()} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payText}>تأكيد الدفع</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  topBar: {
    backgroundColor: QNB_BLUE,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qnbText: { color: "#fff", fontWeight: "800", fontSize: 22, fontFamily: font },
  container: { flex: 1, padding: 20 },
  title: { color: "#0f172a", fontSize: 22, fontWeight: "800", textAlign: "center", fontFamily: font },
  amount: { color: "#0f172a", fontSize: 18, fontWeight: "800", marginTop: 14, textAlign: "right", fontFamily: font },
  service: { color: "#334155", marginTop: 6, textAlign: "right", fontFamily: font },
  label: { color: "#334155", marginTop: 14, marginBottom: 6, fontWeight: "700", fontFamily: font },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  payBtn: {
    marginTop: 22,
    backgroundColor: QNB_BLUE,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  payText: { color: "#fff", fontWeight: "800", fontSize: 16, fontFamily: font },
});
