export async function onRequest(context: any) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("Missing Stripe-Signature", { status: 400 });

  // IMPORTANT: raw body
  const body = await request.text();

  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  const verified = await verifyStripeSignature(body, sig, secret, 300);
  if (!verified) return new Response("Invalid signature", { status: 400 });

  // Parse only after verification
  const event = JSON.parse(body);

  // TODO: handle event types here (keep fast)
  // console.log(event.type);

  return new Response("ok", { status: 200 });
}

async function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSeconds: number) {
  // Header format: "t=...,v1=...,v1=..."
  const items = header.split(",").map((p) => p.trim());
  const tItem = items.find((p) => p.startsWith("t="));
  if (!tItem) return false;

  const ts = parseInt(tItem.slice(2), 10);
  if (!Number.isFinite(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) return false;

  const signedPayload = `${ts}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);

  const v1s = items.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return v1s.some((v) => timingSafeEqualHex(v, expected));
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
