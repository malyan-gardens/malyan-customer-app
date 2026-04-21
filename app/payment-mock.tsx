import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import {
} from "../lib/orderFlow";
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
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState("عميل مليان");
  const [issuedDate, setIssuedDate] = useState("");
  const [invoiceRow, setInvoiceRow] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        #invoice-actions { display: none !important; }
        body * { visibility: hidden; }
        #invoice-print, #invoice-print * { visibility: visible; }
        #invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
          message: `طلب ${orderIdStr.slice(0, 8)} — ${Number(ord?.total_amount ?? amount)} QAR`,
          body: `طلب ${orderIdStr}`,
          type: "order",
          reference_id: orderIdStr,
          reference_type: "orders",
          read: false,
        });

        const draft = useCheckoutDraftStore.getState();
        if (!draft.fromDirectProduct) useCartStore.getState().clear();
        useCheckoutDraftStore.getState().reset();
        setLoading(false);
        router.replace("/order-success");
      } catch (e) {
        console.log(e);
        setLoading(false);
      }
      return;
    }

    let nextUserName = "عميل مليان";
    let nextUserEmail = "";
    const today = new Date().toISOString().split("T")[0];
    const dateLabel = new Date().toLocaleDateString("ar-QA");

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
      void invoiceData;
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

    try {
      if (nextUserEmail) {
        const { data: latestInvoice } = await supabase
          .from("invoices")
          .select("*")
          .eq("customer_email", nextUserEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setInvoiceRow((latestInvoice as Record<string, any> | null) ?? null);
      }
    } catch (e) {
      console.log(e);
    }

    setUserName(nextUserName);
    setIssuedDate(dateLabel);
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.successWrap} nativeID="invoice-print">
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceHeaderTitle}>مليان للتجارة والحدائق | Malyan For Trading and Gardens</Text>
            <Text style={styles.invoiceHeaderSub}>CR No: 189013, Doha - Qatar</Text>
          </View>
          <Text style={styles.successText}>✅ تم الدفع بنجاح!</Text>

          <View style={styles.receiptCard}>
            <Text style={styles.receiptLine}>
              رقم الفاتورة: {String(invoiceRow?.invoice_number ?? "—")}
            </Text>
            <Text style={styles.receiptLine}>
              التاريخ: {String((invoiceRow?.issued_date ?? issuedDate) || new Date().toLocaleDateString("ar-QA"))}
            </Text>
            <Text style={styles.receiptLine}>العميل: {String(invoiceRow?.customer_name ?? userName)}</Text>
            <Text style={styles.receiptLine}>الخدمة: {service}</Text>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={styles.th}>الوصف</Text>
                <Text style={styles.th}>الكمية</Text>
                <Text style={styles.th}>السعر</Text>
                <Text style={styles.th}>الإجمالي</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.td}>{service}</Text>
                <Text style={styles.td}>1</Text>
                <Text style={styles.td}>{amount} QAR</Text>
                <Text style={styles.td}>{amount} QAR</Text>
              </View>
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.receiptStatus}>الإجمالي: {amount} QAR</Text>
              <Text style={styles.receiptStatus}>حالة الدفع: مدفوع ✅</Text>
            </View>

            <View style={styles.thanksBox}>
              <Text style={styles.thanksText}>شكراً لثقتكم بمليان للحدائق</Text>
              <Text style={styles.thanksText}>تواصل معنا: wa.me/97400000000</Text>
            </View>

            <View style={styles.stamp}>
              <Text style={styles.stampText}>مليان</Text>
              <Text style={styles.stampSmall}>CR 189013</Text>
            </View>
            <Text style={styles.footerText}>www.malyangardens.com</Text>
          </View>

          <View style={styles.actions} nativeID="invoice-actions">
            <Pressable
              style={styles.receiptBtn}
              onPress={() => {
                if (Platform.OS === "web" && typeof window !== "undefined") window.print();
              }}
            >
              <Text style={styles.receiptBtnText}>🖨️ طباعة الفاتورة</Text>
            </Pressable>
            <Pressable style={styles.receiptBtnHome} onPress={() => router.replace("/(tabs)/home")}>
              <Text style={styles.receiptBtnHomeText}>🏠 العودة للرئيسية</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
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
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  successText: { marginTop: 14, color: "#15803d", fontSize: 22, fontWeight: "800", fontFamily: font },
  invoiceHeader: {
    width: "92%",
    backgroundColor: "#1a7a3c",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  invoiceHeaderTitle: { color: "#fff", fontWeight: "800", textAlign: "center", fontFamily: font },
  invoiceHeaderSub: { color: "#e5e7eb", marginTop: 4, fontFamily: font },
  receiptCard: {
    marginTop: 18,
    width: "92%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f8fafc",
    gap: 6,
  },
  receiptLine: { color: "#0f172a", fontSize: 14, fontFamily: font, textAlign: "right" },
  receiptStatus: { color: "#15803d", fontWeight: "800", fontFamily: font, textAlign: "right", marginTop: 4 },
  table: { marginTop: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, overflow: "hidden" },
  tableRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8 },
  tableHead: { backgroundColor: "#1a7a3c" },
  th: { color: "#fff", fontSize: 12, fontWeight: "700", width: "24%", textAlign: "center", fontFamily: font },
  td: { color: "#111827", fontSize: 12, width: "24%", textAlign: "center", fontFamily: font },
  totalBox: { marginTop: 12, alignItems: "flex-end" },
  thanksBox: { marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: "#f3f4f6" },
  thanksText: { color: "#374151", textAlign: "right", fontFamily: font, marginTop: 2 },
  stamp: {
    alignSelf: "center",
    marginTop: 16,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  stampText: { color: "#16a34a", fontWeight: "800", fontFamily: font },
  stampSmall: { color: "#16a34a", fontSize: 11, fontFamily: font },
  footerText: { marginTop: 10, textAlign: "center", color: "#6b7280", fontFamily: font },
  actions: { width: "92%" },
  receiptBtn: {
    marginTop: 10,
    width: "100%",
    backgroundColor: QNB_BLUE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  receiptBtnText: { color: "#fff", fontWeight: "700", fontFamily: font },
  receiptBtnHome: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  receiptBtnHomeText: { color: "#fff", fontWeight: "800", fontFamily: font },
});
