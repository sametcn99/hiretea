import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit/log";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function isValidSignature(payload: string, signature: string | null) {
  if (!env.GITEA_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const digest = createHmac("sha256", env.GITEA_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const eventName = request.headers.get("x-gitea-event") ?? "unknown";
  const deliveryId = request.headers.get("x-gitea-delivery");
  const signature = request.headers.get("x-gitea-signature");

  if (env.GITEA_WEBHOOK_SECRET && !isValidSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as unknown;

  await createAuditLog({
    action: "gitea.webhook.received",
    resourceType: "WebhookDelivery",
    resourceId: deliveryId,
    detail: {
      eventName,
      payload,
    },
  });

  return NextResponse.json({ ok: true, eventName });
}
