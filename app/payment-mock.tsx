import { Ionicons } from "@expo/vector-icons";
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
  const params = useLocalSearchParams<{ amount?: string; service?: string }>();
  const amount = Number(params.amount ?? 0);
  const service = String(params.service ?? "خدمة صيانة");

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [userName, setUserName] = useState("عميل مليان");
  const [userEmail, setUserEmail] = useState("");
  const [issuedDate, setIssuedDate] = useState("");

  const buildInvoiceHtml = (name: string, email: string, invNo: string, dateLabel: string) => `
      <div dir="rtl" style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a7a3c; color: white; padding: 20px; text-align: center;">
          <h1>مليان للتجارة والحدائق</h1>
          <p>Malyan For Trading and Gardens</p>
          <p>CR No: 189013 | Salwa Road HBK Building, Doha Qatar</p>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <h2>فاتورة ضريبية</h2>
          <p><strong>رقم الفاتورة:</strong> ${invNo}</p>
          <p><strong>التاريخ:</strong> ${dateLabel}</p>
          <p><strong>العميل:</strong> ${name}</p>
          <p><strong>الإيميل:</strong> ${email}</p>
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #1a7a3c; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd;">الوصف</th>
              <th style="padding: 10px; border: 1px solid #ddd;">الكمية</th>
              <th style="padding: 10px; border: 1px solid #ddd;">السعر</th>
              <th style="padding: 10px; border: 1px solid #ddd;">الإجمالي</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">1</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${amount} QAR</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${amount} QAR</td>
            </tr>
          </table>
          <div style="text-align: left; margin-top: 20px;">
            <p><strong>الإجمالي: ${amount} QAR</strong></p>
            <p style="color: green;"><strong>✅ تم الدفع</strong></p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #f5f5f5;">
            <p><strong>تفاصيل البنك:</strong></p>
            <p>Qatar National Bank (QNB)</p>
            <p>Account: 0260-572537-001</p>
            <p>IBAN: QA82QNBA000000000260572537001</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #666;">
          <p>شكراً لثقتكم بمليان للتجارة والحدائق</p>
          <p>+974 31252262 | Info@Malyangardens.com | www.malyangardens.com</p>
        </div>
      </div>
    `;

  const sendEmailViaApi = async (to: string, subject: string, html: string) => {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  };

  const confirmPayment = async () => {
    setLoading(true);

    let nextUserName = "عميل مليان";
    let nextUserEmail = "";
    let nextInvoiceNumber = "";
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
      nextInvoiceNumber = invoiceData?.invoice_number ?? "";
    } catch (e) {
      console.log(e);
    }

    try {
      if (nextUserEmail) {
        const subject = `فاتورة مليان للحدائق - ${nextInvoiceNumber}`;
        const html = buildInvoiceHtml(nextUserName, nextUserEmail, nextInvoiceNumber, dateLabel);
        await sendEmailViaApi(nextUserEmail, subject, html);
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

    setUserName(nextUserName);
    setUserEmail(nextUserEmail);
    setInvoiceNumber(nextInvoiceNumber);
    setIssuedDate(dateLabel);
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.successWrap}>
          <Ionicons name="checkmark-circle" size={78} color="#16a34a" />
          <Text style={styles.successText}>تم الدفع بنجاح!</Text>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptLine}>رقم الفاتورة: {invoiceNumber || "—"}</Text>
            <Text style={styles.receiptLine}>الخدمة: {service}</Text>
            <Text style={styles.receiptLine}>المبلغ: {amount} QAR</Text>
            <Text style={styles.receiptLine}>التاريخ: {issuedDate || new Date().toLocaleDateString("ar-QA")}</Text>
            <Text style={styles.receiptStatus}>حالة الدفع: مدفوع ✅</Text>
          </View>
          <Pressable
            style={styles.receiptBtn}
            onPress={() => {
              if (Platform.OS === "web" && typeof window !== "undefined") window.print();
            }}
          >
            <Text style={styles.receiptBtnText}>طباعة الإيصال</Text>
          </Pressable>
          <Pressable
            style={styles.receiptBtn}
            onPress={() => {
              if (!userEmail) return;
              const subject = `فاتورة مليان للحدائق - ${invoiceNumber}`;
              const html = buildInvoiceHtml(
                userName,
                userEmail,
                invoiceNumber,
                issuedDate || new Date().toLocaleDateString("ar-QA")
              );
              void sendEmailViaApi(userEmail, subject, html);
            }}
          >
            <Text style={styles.receiptBtnText}>إرسال بالإيميل</Text>
          </Pressable>
          <Pressable style={styles.receiptBtnHome} onPress={() => router.replace("/(tabs)/home")}>
            <Text style={styles.receiptBtnHomeText}>العودة للرئيسية</Text>
          </Pressable>
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
  successText: { marginTop: 14, color: "#15803d", fontSize: 24, fontWeight: "800", fontFamily: font },
  receiptCard: {
    marginTop: 18,
    width: "88%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f8fafc",
    gap: 6,
  },
  receiptLine: { color: "#0f172a", fontSize: 14, fontFamily: font, textAlign: "right" },
  receiptStatus: { color: "#15803d", fontWeight: "800", fontFamily: font, textAlign: "right", marginTop: 4 },
  receiptBtn: {
    marginTop: 10,
    width: "88%",
    backgroundColor: QNB_BLUE,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  receiptBtnText: { color: "#fff", fontWeight: "700", fontFamily: font },
  receiptBtnHome: {
    marginTop: 10,
    width: "88%",
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  receiptBtnHomeText: { color: "#fff", fontWeight: "800", fontFamily: font },
});
