import { Resend } from "resend";

const COMPANY_NAME = "مليان للتجارة والحدائق";

function normalizeItem(it: any) {
  const name = String(it.description ?? it.name ?? it.name_ar ?? "منتج").trim();
  const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
  const price = Number(it.unitPrice ?? it.price ?? it.selling_price ?? 0);
  const total = Number(it.lineTotal ?? it.total) || qty * price;
  return { name, qty, price, total };
}

function buildInvoiceHtmlBody(p: any): string {
  const items = Array.isArray(p.items) ? p.items.map(normalizeItem) : [];
  const rows =
    items
      .map(
        (it: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${it.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${it.qty}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${it.price.toFixed(2)} ر.ق</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${it.total.toFixed(2)} ر.ق</td>
    </tr>`
      )
      .join("") ||
    '<tr><td colspan="4" style="padding:10px;text-align:center;color:#777;">لا توجد عناصر</td></tr>';

  return `
  <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#111;background:#fff;padding:24px;max-width:600px;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1a7a3c;padding-bottom:12px;margin-bottom:20px;">
      <h2 style="margin:0;color:#1a7a3c;">🌿 ${COMPANY_NAME}</h2>
      <h3 style="margin:0;">فاتورة</h3>
    </div>
    <p><strong>اسم العميل:</strong> ${p.customerName ?? "عميل"}</p>
    <p><strong>رقم الفاتورة:</strong> ${p.invoiceNumber ?? "—"}</p>
    <p><strong>التاريخ:</strong> ${p.issuedDate ?? new Date().toLocaleDateString("ar")}</p>
    <p><strong>طريقة الدفع:</strong> ${p.paymentMethod ?? "—"}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#1a7a3c;color:#fff;">
          <th style="padding:10px;border:1px solid #ddd;text-align:right;">المنتج</th>
          <th style="padding:10px;border:1px solid #ddd;">الكمية</th>
          <th style="padding:10px;border:1px solid #ddd;">السعر</th>
          <th style="padding:10px;border:1px solid #ddd;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:16px;font-weight:bold;color:#1a7a3c;">الإجمالي: ${Number(p.total ?? p.totalAmount ?? 0).toFixed(2)} ر.ق</p>
    <div style="border-top:1px solid #e5e7eb;padding-top:12px;color:#666;font-size:12px;text-align:center;">
      شكراً لثقتكم بنا 🌿<br/>${COMPANY_NAME} | الدوحة، قطر
    </div>
  </div>`;
}

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(200).json({ success: false, skipped: true });

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "invoices@send.malyangardens.com";

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const to = String(body.to ?? "").trim();
    if (!to)
      return res.status(400).json({ success: false, message: "Customer email is required" });

    await resend.emails.send({
      from: `${COMPANY_NAME} <${fromEmail}>`,
      to,
      subject: String(body.subject || `فاتورة - ${body.invoiceNumber || body.orderId || ""}`),
      html: buildInvoiceHtmlBody(body),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] send failed", message);
    return res.status(500).json({ success: false, message });
  }
}
