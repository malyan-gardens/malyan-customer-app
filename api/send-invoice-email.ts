import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY missing");
    return res.status(200).json({ skipped: true });
  }

  const body = req.body;
  const to = String(body.to ?? "").trim();
  if (!to) return res.status(200).json({ skipped: true, reason: "no email" });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `مليان للحدائق <${process.env.FROM_EMAIL ?? "invoices@malyangardens.com"}>`,
        to: [to],
        subject: body.subject ?? "فاتورة مليان للحدائق",
        html: body.html ?? "<p>شكراً لثقتكم بمليان للحدائق</p>",
      }),
    });

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Email send failed:", error);
    return res.status(200).json({ skipped: true });
  }
}
