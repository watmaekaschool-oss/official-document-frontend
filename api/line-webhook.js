import crypto from "node:crypto";

function hasEnv(name) {
  return typeof process.env[name] === "string" && process.env[name].trim() !== "";
}

function verifyLineSignature(rawBody, receivedSignature, channelSecret) {
  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(receivedSignature || "", "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET() {
  // Shows only whether variables exist; never reveals secret values.
  const status = {
    relay: "running",
    LINE_CHANNEL_SECRET: hasEnv("LINE_CHANNEL_SECRET") ? "SET" : "MISSING",
    GAS_LINE_WEBHOOK_URL: hasEnv("GAS_LINE_WEBHOOK_URL") ? "SET" : "MISSING"
  };
  return Response.json(status, { status: 200 });
}

export async function POST(request) {
  try {
    if (!hasEnv("LINE_CHANNEL_SECRET") || !hasEnv("GAS_LINE_WEBHOOK_URL")) {
      console.error("Missing required environment variables", {
        LINE_CHANNEL_SECRET: hasEnv("LINE_CHANNEL_SECRET"),
        GAS_LINE_WEBHOOK_URL: hasEnv("GAS_LINE_WEBHOOK_URL")
      });
      return new Response("Missing server configuration", { status: 500 });
    }

    const rawBody = await request.text();
    const receivedSignature = request.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, receivedSignature, process.env.LINE_CHANNEL_SECRET)) {
      console.error("LINE signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // LINE's Verify button sends events: [].
    // Returning 200 here avoids an unnecessary Apps Script round trip.
    if (Array.isArray(payload.events) && payload.events.length === 0) {
      return new Response("OK", { status: 200 });
    }

    // Real webhook event: forward to Apps Script so it can capture groupId.
    try {
      const upstream = await fetch(process.env.GAS_LINE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-line-signature": receivedSignature,
          "x-wmk-relay": "vercel-line-webhook-v3.8.2"
        },
        body: rawBody,
        redirect: "follow"
      });

      const upstreamText = await upstream.text().catch(() => "");

      // Log upstream trouble, but acknowledge LINE after a valid signed webhook.
      // LINE recommends quick 200 responses; processing can be asynchronous.
      if (!upstream.ok) {
        console.error("Apps Script upstream returned non-2xx", {
          status: upstream.status,
          preview: upstreamText.slice(0, 300)
        });
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Apps Script forwarding error", err);
      return new Response("OK", { status: 200 });
    }
  } catch (err) {
    console.error("Unhandled LINE webhook error", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
