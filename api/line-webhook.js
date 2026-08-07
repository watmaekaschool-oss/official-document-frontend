import crypto from "node:crypto";

function secureEqual(a, b) {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const gasWebhookUrl = process.env.GAS_LINE_WEBHOOK_URL;

  if (!channelSecret || !gasWebhookUrl) {
    console.error("Missing LINE_CHANNEL_SECRET or GAS_LINE_WEBHOOK_URL");
    return new Response("Server configuration missing", { status: 500 });
  }

  // LINE signature verification MUST use the exact raw request body.
  const rawBody = await request.text();
  const lineSignature = request.headers.get("x-line-signature") || "";

  const expectedSignature = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  if (!secureEqual(lineSignature, expectedSignature)) {
    console.warn("Invalid LINE signature");
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    // Forward the exact LINE JSON body to Google Apps Script.
    // fetch() follows Google's ContentService redirects automatically.
    const gasResponse = await fetch(gasWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": lineSignature,
        "x-wmk-relay": "vercel-line-webhook-v3.8.1"
      },
      body: rawBody,
      redirect: "follow"
    });

    const responseText = await gasResponse.text().catch(() => "");

    if (!gasResponse.ok) {
      console.error(
        "Google Apps Script relay failed:",
        gasResponse.status,
        responseText.slice(0, 500)
      );
      return new Response("Upstream webhook failed", { status: 502 });
    }

    // LINE requires an HTTP 200 response.
    return new Response("OK", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  } catch (error) {
    console.error("Webhook relay error:", error);
    return new Response("Webhook relay error", { status: 502 });
  }
}

export function GET() {
  // Useful for checking that the Vercel route exists in a browser.
  return new Response("WMK LINE webhook relay is running", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
