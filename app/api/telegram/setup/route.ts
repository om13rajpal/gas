import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/telegram`;

  if (!token) {
    return NextResponse.json({ error: "No bot token configured" }, { status: 500 });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Set webhook
  const webhookBody: Record<string, string> = { url: webhookUrl };
  if (webhookSecret) {
    webhookBody.secret_token = webhookSecret;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    }
  );
  const data = await res.json();

  return NextResponse.json({
    webhook_url: webhookUrl,
    telegram_response: data,
  });
}
