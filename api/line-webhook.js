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
  return Response.json({
    relay: "running",
    LINE_CHANNEL_SECRET: hasEnv("LINE_CHANNEL_SECRET") ? "SET" : "MISSING",
    mode: "capture-group-id"
  }, { status: 200 });
}

export async function POST(request) {
  try {
    if (!hasEnv("LINE_CHANNEL_SECRET")) {
      console.error("Missing LINE_CHANNEL_SECRET");
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

    const events = Array.isArray(payload.events) ? payload.events : [];

    // LINE Verify sends an empty events array.
    if (events.length === 0) {
      return new Response("OK", { status: 200 });
    }

    for (const event of events) {
      const source = event && event.source ? event.source : {};
      if (source.type === "group" && source.groupId) {
        // Intentionally log only the groupId for manual one-time setup.
        console.log("WMK_LINE_GROUP_ID_CAPTURED:", source.groupId);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Unhandled LINE webhook error", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
