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

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function buildInvoiceHtml(input: {
  orderId: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; lineTotal: number; currency?: string }>;
  total: number;
  paymentMethod: string;
  address: string;
}): string {
  const rows = input.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border:1px solid #ddd;">${i.name}</td><td style="padding:8px;border:1px solid #ddd;">${i.quantity}</td><td style="padding:8px;border:1px solid #ddd;">${i.lineTotal.toFixed(2)} ${i.currency ?? "QAR"}</td></tr>`
    )
    .join("");
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
      <h2>فاتورة طلبك من مليان للحدائق</h2>
      <p><strong>رقم الطلب:</strong> ${input.orderId}</p>
      <p><strong>العميل:</strong> ${input.customerName}</p>
      <p><strong>العنوان:</strong> ${input.address || "—"}</p>
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
        const { error: upErr } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderIdStr);
        if (upErr) throw upErr;

        const { data: ord, error: fetchErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderIdStr)
          .single();
        if (fetchErr) throw fetchErr;

        const rawItems = Array.isArray(ord?.items) ? ord.items : [];
        let customerEmail = "";
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          customerEmail = user?.email ?? "";
        } catch {
          customerEmail = "";
        }
        try {
          const htmlItems = rawItems.map((row: Record<string, unknown>) => ({
            name: String(row.name ?? "منتج"),
            quantity: Number(row.quantity ?? 1),
            lineTotal: Number(row.lineTotal ?? 0),
            currency: String(row.currency ?? "QAR"),
          }));
          await fetch("/api/send-invoice-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: customerEmail,
              subject: "فاتورة طلبك من مليان للحدائق",
              html: buildInvoiceHtml({
                orderId: orderIdStr,
                customerName: String(ord?.customer_name ?? ""),
                items: htmlItems,
                total: Number(ord?.total_amount ?? amount),
                paymentMethod: "الدفع أونلاين",
                address: String(ord?.address ?? ""),
              }),
            }),
          });
        } catch {
          // silently skip if email fails
        }

        for (const row of rawItems as Record<string, unknown>[]) {
          const productId = String(row.productId ?? "");
          if (!productId) continue;
          const orderedQty = Number(row.quantity ?? 0);
          if (orderedQty <= 0) continue;

          const { data: inv } = await supabase
            .from("inventory")
            .select("quantity")
            .eq("id", productId)
            .single();

          if (inv && Number(inv.quantity ?? 0) > 0) {
            const newQty = Math.max(0, Number(inv.quantity ?? 0) - orderedQty);
            await supabase
              .from("inventory")
              .update({ quantity: newQty })
              .eq("id", productId);
          }
        }

        await supabase.from("notifications").insert({
          title: "تم دفع طلب أونلاين",
          body: `${String(ord?.customer_name ?? "عميل")} — ${service}`,
          type: "order",
          reference_id: orderIdStr,
          reference_type: "orders",
          is_read: false,
        });

        setLoading(false);
        router.replace({
          pathname: "/order-success",
          params: {
            orderId: orderIdStr,
            total: String(Number(ord?.total_amount ?? amount)),
          },
        });
        setTimeout(() => {
          useCartStore.getState().clear();
          useCheckoutDraftStore.getState().reset();
        }, 1000);
      } catch (e) {
        console.log(e);
        setLoading(false);
      }
      return;
    }

    let nextUserName = "عميل مليان";
    let nextUserEmail = "";
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
      nextUserName =
        (typeof metadata.full_name === "string" && metadata.full_name) ||
        (typeof metadata.name === "string" && metadata.name) ||
        user?.email ||
        "عميل مليان";
      nextUserEmail = user?.email ?? "";
    } catch (e) {
      console.log(e);
    }

    try {
      const { data: invoiceData } = await supabase
        .from("invoices")
        .insert({
          invoice_number: "",
          customer_name: nextUserName,
          customer_email: nextUserEmail,
          customer_phone: "",
          customer_address: "Doha, Qatar",
          items: [
            {
              description: service,
              unit: "خدمة",
              qty: 1,
              rate: amount,
              amount,
            },
          ],
          subtotal: amount,
          discount: 0,
          previous_payments: 0,
          partial_payment: 0,
          total_amount: amount,
          payment_method: "دفع إلكتروني",
          payment_status: "paid",
          issued_date: today,
          due_date: today,
          notes: "تم الدفع عبر بوابة QNB الإلكترونية",
        })
        .select("invoice_number")
        .single();
      try {
        await fetch("/api/send-invoice-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: nextUserEmail,
            subject: "فاتورة طلبك من مليان للحدائق",
            html: buildInvoiceHtml({
              orderId: String(invoiceData?.invoice_number ?? "direct"),
              customerName: nextUserName,
              items: [{ name: service, quantity: 1, lineTotal: amount, currency: "QAR" }],
              total: amount,
              paymentMethod: "الدفع أونلاين",
              address: "Doha, Qatar",
            }),
          }),
        });
      } catch {
        // silently skip if email fails
      }
    } catch (e) {
      console.log(e);
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

    setLoading(false);
    router.replace({
      pathname: "/order-success",
      params: {
        orderId: "direct",
        total: String(amount),
      },
    });
    setTimeout(() => {
      useCartStore.getState().clear();
      useCheckoutDraftStore.getState().reset();
    }, 1000);
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
