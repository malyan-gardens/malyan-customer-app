export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { to, subject, html } = req.body || {};

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer re_BBUdK2xD_BDxK8CV6g8yhmjFVLEYqMTnh",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "مليان للحدائق <invoices@send.malyangardens.com>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();
  return res.status(response.status).json(data);
}
